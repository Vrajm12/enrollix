import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";
import { invalidateDashboardSummaryCache } from "./dashboardSummaryCache.js";

export const ASSIGNMENT_ACTION = {
  ASSIGN: "ASSIGN",
  REASSIGN: "REASSIGN",
  UNASSIGN: "UNASSIGN",
  RESTORE: "RESTORE"
} as const;

export type AssignmentActionType = typeof ASSIGNMENT_ACTION[keyof typeof ASSIGNMENT_ACTION];

type LeadAssignmentSnapshot = {
  id: number;
  tenantId: number;
  assignedTo: number | null;
};

type AssignmentAuditContext = {
  assignedBy: number | null;
  sourceModule: string;
  batchId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  actionType?: AssignmentActionType;
};

type CreateBatchParams = {
  tenantId: number;
  assignedBy: number | null;
  assignedTo: number | null;
  leadCount: number;
  pincode?: string | null;
  source?: string | null;
  startRange: number;
  endRange: number;
  sourceModule?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

type AssignmentConflict = {
  leadId: number;
  oldAssignedTo: number;
  newAssignedTo: number | null;
};

export class AssignmentConfirmationError extends Error {
  statusCode = 409;
  conflicts: AssignmentConflict[];

  constructor(conflicts: AssignmentConflict[]) {
    super("Assignment would reassign leads that already have an owner. Send confirmReassignment=true to proceed.");
    this.conflicts = conflicts;
  }
}

export const getAssignmentConflicts = (
  leads: LeadAssignmentSnapshot[],
  newAssignedTo: number | null
): AssignmentConflict[] =>
  leads
    .filter((lead) => lead.assignedTo !== null && lead.assignedTo !== newAssignedTo)
    .map((lead) => ({
      leadId: lead.id,
      oldAssignedTo: lead.assignedTo!,
      newAssignedTo
    }));

export const assertAssignmentConfirmed = (
  leads: LeadAssignmentSnapshot[],
  newAssignedTo: number | null,
  confirmReassignment: boolean
) => {
  const conflicts = getAssignmentConflicts(leads, newAssignedTo);
  if (conflicts.length > 0 && !confirmReassignment) {
    throw new AssignmentConfirmationError(conflicts);
  }
};

const inferActionType = (
  oldAssignedTo: number | null,
  newAssignedTo: number | null,
  override?: AssignmentActionType
): AssignmentActionType => {
  if (override) return override;
  if (newAssignedTo === null) return ASSIGNMENT_ACTION.UNASSIGN;
  if (oldAssignedTo === null) return ASSIGNMENT_ACTION.ASSIGN;
  return ASSIGNMENT_ACTION.REASSIGN;
};

export const createAssignmentBatch = async (
  tx: Prisma.TransactionClient,
  params: CreateBatchParams
) => {
  const batchId = randomUUID();
  await tx.leadAssignmentBatch.create({
    data: {
      batchId,
      tenantId: params.tenantId,
      assignedBy: params.assignedBy,
      assignedTo: params.assignedTo,
      leadCount: params.leadCount,
      pincode: params.pincode ?? null,
      source: params.source ?? null,
      startRange: params.startRange,
      endRange: params.endRange
    }
  });
  await tx.securityEvent.create({
    data: {
      id: randomUUID(),
      tenantId: params.tenantId,
      userId: params.assignedBy,
      action: "CREATE",
      resource: "LeadAssignmentBatch",
      status: "SUCCESS",
      details: {
        batchId,
        assignedTo: params.assignedTo,
        leadCount: params.leadCount,
        pincode: params.pincode ?? null,
        source: params.source ?? null,
        startRange: params.startRange,
        endRange: params.endRange,
        sourceModule: params.sourceModule ?? null
      },
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null
    }
  });
  return batchId;
};

export const logLeadAssignmentChanges = async (
  tx: Prisma.TransactionClient,
  leads: LeadAssignmentSnapshot[],
  newAssignedTo: number | null,
  context: AssignmentAuditContext
) => {
  const changed = leads.filter((lead) => lead.assignedTo !== newAssignedTo);
  if (changed.length === 0) return 0;

  await tx.leadAssignmentLog.createMany({
    data: changed.map((lead) => ({
      id: randomUUID(),
      leadId: lead.id,
      tenantId: lead.tenantId,
      oldAssignedTo: lead.assignedTo,
      newAssignedTo,
      assignedBy: context.assignedBy,
      actionType: inferActionType(lead.assignedTo, newAssignedTo, context.actionType),
      sourceModule: context.sourceModule,
      batchId: context.batchId ?? null
    }))
  });

  await tx.securityEvent.createMany({
    data: changed.map((lead) => ({
      id: randomUUID(),
      tenantId: lead.tenantId,
      userId: context.assignedBy,
      action: "UPDATE",
      resource: "LeadAssignment",
      resourceId: lead.id,
      status: "SUCCESS",
      details: {
        oldAssignedTo: lead.assignedTo,
        newAssignedTo,
        actionType: inferActionType(lead.assignedTo, newAssignedTo, context.actionType),
        sourceModule: context.sourceModule,
        batchId: context.batchId ?? null
      },
      ipAddress: context.ipAddress ?? null,
      userAgent: context.userAgent ?? null
    }))
  });

  invalidateDashboardSummaryCache(changed[0].tenantId);
  return changed.length;
};

export const assignLeadIdsWithHistory = async (params: {
  tenantId: number;
  leadIds: number[];
  newAssignedTo: number | null;
  assignedBy: number | null;
  sourceModule: string;
  confirmReassignment: boolean;
  actionType?: AssignmentActionType;
  batch?: Omit<CreateBatchParams, "tenantId" | "assignedBy" | "assignedTo" | "leadCount">;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  if (params.leadIds.length === 0) {
    return { updatedCount: 0, loggedCount: 0, batchId: null as string | null };
  }

  const uniqueLeadIds = Array.from(new Set(params.leadIds));

  return prisma.$transaction(async (tx) => {
    const leads = await tx.lead.findMany({
      where: {
        tenantId: params.tenantId,
        id: { in: uniqueLeadIds }
      },
      select: {
        id: true,
        tenantId: true,
        assignedTo: true
      }
    });

    assertAssignmentConfirmed(leads, params.newAssignedTo, params.confirmReassignment);

    const batchId = params.batch
      ? await createAssignmentBatch(tx, {
          ...params.batch,
          tenantId: params.tenantId,
          assignedBy: params.assignedBy,
          assignedTo: params.newAssignedTo,
          leadCount: leads.length,
          sourceModule: params.sourceModule,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent
        })
      : null;

    const loggedCount = await logLeadAssignmentChanges(tx, leads, params.newAssignedTo, {
      assignedBy: params.assignedBy,
      sourceModule: params.sourceModule,
      actionType: params.actionType,
      batchId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    const changedLeadIds = leads
      .filter((lead) => lead.assignedTo !== params.newAssignedTo)
      .map((lead) => lead.id);

    const updateResult = changedLeadIds.length === 0
      ? { count: 0 }
      : await tx.lead.updateMany({
          where: {
            tenantId: params.tenantId,
            id: { in: changedLeadIds }
          },
          data: {
            assignedTo: params.newAssignedTo
          }
        });

    return { updatedCount: updateResult.count, loggedCount, batchId };
  });
};

export const restoreAssignmentsFromBatch = async (params: {
  tenantId: number;
  batchId: string;
  assignedBy: number | null;
  confirmReassignment: boolean;
  apply: boolean;
  sourceModule: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  const batch = await prisma.leadAssignmentBatch.findFirst({
    where: {
      tenantId: params.tenantId,
      batchId: params.batchId
    }
  });
  if (!batch) {
    throw new Error("Assignment batch not found");
  }

  const batchLogs = await prisma.leadAssignmentLog.findMany({
    where: {
      tenantId: params.tenantId,
      batchId: params.batchId
    },
    distinct: ["leadId"],
    select: { leadId: true },
    orderBy: { createdAt: "asc" }
  });
  const leadIds = batchLogs.map((log) => log.leadId);

  const leads = leadIds.length === 0
    ? []
    : await prisma.lead.findMany({
        where: {
          tenantId: params.tenantId,
          id: { in: leadIds }
        },
        select: { id: true, tenantId: true, assignedTo: true }
      });

  const conflicts = getAssignmentConflicts(leads, batch.assignedTo);
  const changedLeadIds = leads
    .filter((lead) => lead.assignedTo !== batch.assignedTo)
    .map((lead) => lead.id);

  const dryRun = {
    batchId: batch.batchId,
    tenantId: batch.tenantId,
    assignedTo: batch.assignedTo,
    originalLeadCount: batch.leadCount,
    foundLeadCount: leads.length,
    changedLeadCount: changedLeadIds.length,
    conflictCount: conflicts.length,
    conflicts: conflicts.slice(0, 25),
    apply: params.apply
  };

  if (!params.apply) {
    return { ...dryRun, updatedCount: 0, loggedCount: 0 };
  }

  assertAssignmentConfirmed(leads, batch.assignedTo, params.confirmReassignment);

  const result = await prisma.$transaction(async (tx) => {
    const loggedCount = await logLeadAssignmentChanges(tx, leads, batch.assignedTo, {
      assignedBy: params.assignedBy,
      sourceModule: params.sourceModule,
      actionType: ASSIGNMENT_ACTION.RESTORE,
      batchId: params.batchId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent
    });

    const updateResult = changedLeadIds.length === 0
      ? { count: 0 }
      : await tx.lead.updateMany({
          where: {
            tenantId: params.tenantId,
            id: { in: changedLeadIds }
          },
          data: { assignedTo: batch.assignedTo }
        });

    return { updatedCount: updateResult.count, loggedCount };
  });

  return { ...dryRun, ...result };
};
