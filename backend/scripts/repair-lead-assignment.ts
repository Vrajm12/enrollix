import "dotenv/config";
import { Prisma } from "@prisma/client";
import { prisma } from "../src/prisma.js";
import {
  assignLeadIdsWithHistory,
  AssignmentConfirmationError,
  getAssignmentConflicts,
  restoreAssignmentsFromBatch
} from "../src/services/leadAssignmentService.js";

type Options = {
  tenantSlug: string;
  email: string;
  startLeadNumber: number;
  endLeadNumber: number;
  pincode?: string;
  source?: string;
  batchId?: string;
  onlyUnassigned: boolean;
  confirmReassignment: boolean;
  apply: boolean;
};

const readOption = (args: string[], name: string) => {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length).trim();

  const index = args.indexOf(`--${name}`);
  if (index >= 0) return args[index + 1]?.trim();
  return undefined;
};

const readPositiveInt = (args: string[], name: string, fallback?: number) => {
  const raw = readOption(args, name);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${name} must be a positive integer`);
  }
  return value;
};

const parseOptions = (): Options => {
  const args = process.argv.slice(2);
  const tenantSlug = readOption(args, "tenantSlug")?.toLowerCase();
  const email = readOption(args, "email")?.toLowerCase();
  const count = readPositiveInt(args, "count");
  const startLeadNumber = readPositiveInt(args, "start", 1)!;
  const endLeadNumber = readPositiveInt(args, "end", count ? startLeadNumber + count - 1 : undefined);
  const batchId = readOption(args, "batchId");

  if (!tenantSlug) throw new Error("--tenantSlug is required");
  if (!email) throw new Error("--email is required");
  if (!batchId && !endLeadNumber) throw new Error("--batchId, --end, or --count is required");
  if (batchId && (count || readOption(args, "start") || readOption(args, "end"))) {
    throw new Error("--batchId cannot be combined with --start, --end, or --count");
  }
  if (!batchId && endLeadNumber !== undefined && endLeadNumber < startLeadNumber) {
    throw new Error("--end must be greater than or equal to --start");
  }

  return {
    tenantSlug,
    email,
    startLeadNumber,
    endLeadNumber: endLeadNumber ?? startLeadNumber,
    pincode: readOption(args, "pincode"),
    source: readOption(args, "source"),
    batchId,
    onlyUnassigned: !args.includes("--includeAssigned"),
    confirmReassignment: args.includes("--confirmReassignment"),
    apply: args.includes("--apply")
  };
};

const main = async () => {
  const options = parseOptions();

  const tenant = await prisma.tenant.findUnique({
    where: { slug: options.tenantSlug },
    select: { id: true, name: true, slug: true }
  });
  if (!tenant) throw new Error(`Tenant not found for slug ${options.tenantSlug}`);

  const user = await prisma.user.findFirst({
    where: {
      tenantId: tenant.id,
      email: { equals: options.email, mode: "insensitive" }
    },
    select: { id: true, name: true, email: true, role: true }
  });
  if (!user) throw new Error(`User ${options.email} not found in tenant ${tenant.slug}`);

  if (options.batchId) {
    try {
      const result = await restoreAssignmentsFromBatch({
        tenantId: tenant.id,
        batchId: options.batchId,
        assignedBy: user.id,
        confirmReassignment: options.confirmReassignment,
        apply: options.apply,
        sourceModule: "scripts.repair-lead-assignment"
      });

      console.log("Batch assignment restore");
      console.log(`- Tenant: ${tenant.name} (${tenant.slug}, id ${tenant.id})`);
      console.log(`- Operator: ${user.name} <${user.email}> (${user.role}, id ${user.id})`);
      console.log(`- Batch: ${result.batchId}`);
      console.log(`- Restores to user id: ${result.assignedTo ?? "unassigned"}`);
      console.log(`- Original batch lead count: ${result.originalLeadCount}`);
      console.log(`- Found leads: ${result.foundLeadCount}`);
      console.log(`- Leads needing update: ${result.changedLeadCount}`);
      console.log(`- Reassignment conflicts: ${result.conflictCount}`);
      if (!options.apply) console.log("- Dry run only. Re-run with --apply to update these leads.");
      if (options.apply) console.log(`- Updated leads: ${result.updatedCount}`);
      if (result.conflictCount > 0 && !options.confirmReassignment) {
        console.log("- Add --confirmReassignment with --apply to overwrite existing assignees.");
      }
      return;
    } catch (error) {
      if (error instanceof AssignmentConfirmationError) {
        console.log(`Repair blocked: ${error.message}`);
        console.log(`- Conflicts: ${error.conflicts.length}`);
        console.log("- Re-run with --confirmReassignment if this overwrite is intentional.");
        return;
      }
      throw error;
    }
  }

  const scopeWhere: Prisma.LeadWhereInput = {
    tenantId: tenant.id,
    ...(options.pincode ? { pincode: options.pincode } : {}),
    ...(options.source ? { source: options.source } : {}),
    ...(options.onlyUnassigned ? { assignedTo: null } : {})
  };

  const [currentlyAssigned, scopedLeads] = await Promise.all([
    prisma.lead.count({
      where: {
        tenantId: tenant.id,
        assignedTo: user.id
      }
    }),
    prisma.lead.count({ where: scopeWhere })
  ]);

  if (options.startLeadNumber > scopedLeads) {
    throw new Error(`Start lead number exceeds scoped lead count (${scopedLeads})`);
  }

  const normalizedEnd = Math.min(options.endLeadNumber, scopedLeads);
  const targetLeads = await prisma.lead.findMany({
    where: scopeWhere,
    select: { id: true, tenantId: true, assignedTo: true },
    orderBy: { id: "asc" },
    skip: options.startLeadNumber - 1,
    take: normalizedEnd - options.startLeadNumber + 1
  });
  const targetLeadIds = targetLeads.map((lead) => lead.id);
  const conflicts = getAssignmentConflicts(targetLeads, user.id);

  console.log("Lead assignment repair");
  console.log(`- Tenant: ${tenant.name} (${tenant.slug}, id ${tenant.id})`);
  console.log(`- User: ${user.name} <${user.email}> (${user.role}, id ${user.id})`);
  console.log(`- Currently assigned to user: ${currentlyAssigned}`);
  console.log(`- Scoped leads: ${scopedLeads}`);
  console.log(`- Scope filters: pincode=${options.pincode ?? "any"}, source=${options.source ?? "any"}, onlyUnassigned=${options.onlyUnassigned}`);
  console.log(`- Requested range: ${options.startLeadNumber}-${options.endLeadNumber}`);
  console.log(`- Normalized range: ${options.startLeadNumber}-${normalizedEnd}`);
  console.log(`- Target leads selected: ${targetLeadIds.length}`);
  console.log(`- Reassignment conflicts: ${conflicts.length}`);

  if (!options.apply) {
    console.log("- Dry run only. Re-run with --apply to update these leads.");
    if (conflicts.length > 0) {
      console.log("- Add --confirmReassignment with --apply to overwrite existing assignees.");
    }
    return;
  }

  let result;
  try {
    result = await assignLeadIdsWithHistory({
      tenantId: tenant.id,
      leadIds: targetLeadIds,
      newAssignedTo: user.id,
      assignedBy: user.id,
      sourceModule: "scripts.repair-lead-assignment",
      confirmReassignment: options.confirmReassignment,
      batch: {
        pincode: options.pincode ?? null,
        source: options.source ?? null,
        startRange: options.startLeadNumber,
        endRange: normalizedEnd
      }
    });
  } catch (error) {
    if (error instanceof AssignmentConfirmationError) {
      console.log(`Repair blocked: ${error.message}`);
      console.log(`- Conflicts: ${error.conflicts.length}`);
      console.log("- Re-run with --confirmReassignment if this overwrite is intentional.");
      return;
    }
    throw error;
  }

  console.log(`- Updated leads: ${result.updatedCount}`);
  console.log(`- Logged assignment changes: ${result.loggedCount}`);
  console.log(`- Repair batch id: ${result.batchId}`);
};

main()
  .catch((error) => {
    console.error("Repair failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
