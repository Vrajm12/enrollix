import { Prisma, Role } from "@prisma/client";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isMissingApiRequestLogTableError } from "../utils/prismaErrors.js";
import {
  assignLeadIdsWithHistory,
  AssignmentConfirmationError
} from "../services/leadAssignmentService.js";

const router = Router();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128)
});
const createTeamMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(["COUNSELOR", "ADMIN"]).default("COUNSELOR")
});
const allocateLeadsSchema = z.object({
  userId: z.number().int().positive(),
  startLeadNumber: z.number().int().positive(),
  endLeadNumber: z.number().int().positive(),
  pincode: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).optional(),
  confirmReassignment: z.boolean().optional().default(false)
})
  .refine((payload) => payload.endLeadNumber >= payload.startLeadNumber, {
    message: "endLeadNumber must be greater than or equal to startLeadNumber",
    path: ["endLeadNumber"]
  })
  .refine((payload) => Boolean(payload.pincode || payload.source), {
    message: "pincode or source is required",
    path: ["pincode"]
  });

const allocationSummarySchema = z.object({
  pincode: z.string().trim().min(1).optional(),
  source: z.string().trim().min(1).optional()
}).refine((payload) => Boolean(payload.pincode || payload.source), {
  message: "pincode or source query parameter is required",
  path: ["pincode"]
});

const buildLeadAllocationWhere = (
  tenantId: number,
  filters: { pincode?: string; source?: string }
): Prisma.LeadWhereInput => ({
  tenantId,
  ...(filters.pincode ? { pincode: filters.pincode } : {}),
  ...(filters.source ? { source: filters.source } : {})
});

const formatAllocationScope = (filters: { pincode?: string; source?: string }) => {
  const parts: string[] = [];
  if (filters.pincode) parts.push(`pincode ${filters.pincode}`);
  if (filters.source) parts.push(`source ${filters.source}`);
  return parts.join(" and ");
};

const generateTemporaryPassword = (length = 14) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${password}A1!`;
};

router.get(
  "/course-options",
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { courseOptions: true }
    });

    const values = Array.isArray(tenant?.courseOptions)
      ? tenant.courseOptions.filter((value): value is string => typeof value === "string")
      : [];

    return res.json({ courseOptions: values });
  })
);

router.get(
  "/counselors",
  asyncHandler(async (req, res) => {
    const counselors = await prisma.user.findMany({
      where: {
        tenantId: req.user!.tenantId,
        role: {
          in: [Role.TENANT_ADMIN, Role.ADMIN, Role.COUNSELOR]
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      },
      orderBy: { name: "asc" }
    });

    return res.json(counselors);
  })
);

router.post(
  "/change-password",
  asyncHandler(async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid password payload" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const matches = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!matches) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    return res.json({ success: true, message: "Password updated successfully" });
  })
);

router.get(
  "/team",
  asyncHandler(async (req, res) => {
    if (!req.user || (req.user.role !== Role.TENANT_ADMIN && req.user.role !== Role.ADMIN)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ users });
  })
);

router.get(
  "/team/insights",
  asyncHandler(async (req, res) => {
    if (!req.user || (req.user.role !== Role.TENANT_ADMIN && req.user.role !== Role.ADMIN)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    const userIds = users.map((user) => user.id);
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const activeThreshold = new Date(now.getTime() - 15 * 60 * 1000);
    const recentWindow = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let lastRequests: Array<{ userId: number | null; _max: { createdAt: Date | null } }> = [];
    let requestCounts24h: Array<{ userId: number | null; _count: { id: number } }> = [];

    try {
      [lastRequests, requestCounts24h] = await Promise.all([
        prisma.apiRequestLog.groupBy({
          by: ["userId"],
          where: {
            tenantId: req.user.tenantId,
            userId: { in: userIds }
          },
          _max: { createdAt: true }
        }),
        prisma.apiRequestLog.groupBy({
          by: ["userId"],
          where: {
            tenantId: req.user.tenantId,
            userId: { in: userIds },
            createdAt: { gte: recentWindow }
          },
          _count: { id: true }
        })
      ]);
    } catch (error) {
      if (!isMissingApiRequestLogTableError(error)) {
        throw error;
      }
    }

    const [
      totalLeadsByAssignee,
      leadsByStatus,
      leadsByPriority,
      todayFollowupsByAssignee,
      missedFollowupsByAssignee,
      activitiesByUser,
      whatsappByUser,
      smsByUser,
      logins,
      logouts
    ] = await Promise.all([
      prisma.lead.groupBy({
        by: ["assignedTo"],
        where: {
          tenantId: req.user.tenantId,
          assignedTo: { in: userIds }
        },
        _count: { id: true }
      }),
      prisma.lead.groupBy({
        by: ["assignedTo", "status"],
        where: {
          tenantId: req.user.tenantId,
          assignedTo: { in: userIds }
        },
        _count: { id: true }
      }),
      prisma.lead.groupBy({
        by: ["assignedTo", "priority"],
        where: {
          tenantId: req.user.tenantId,
          assignedTo: { in: userIds }
        },
        _count: { id: true }
      }),
      prisma.lead.groupBy({
        by: ["assignedTo"],
        where: {
          tenantId: req.user.tenantId,
          assignedTo: { in: userIds },
          nextFollowUp: {
            gte: todayStart,
            lt: tomorrowStart
          }
        },
        _count: { id: true }
      }),
      prisma.lead.groupBy({
        by: ["assignedTo"],
        where: {
          tenantId: req.user.tenantId,
          assignedTo: { in: userIds },
          nextFollowUp: { lt: todayStart }
        },
        _count: { id: true }
      }),
      prisma.activity.groupBy({
        by: ["tenantId"],
        where: { tenantId: req.user.tenantId },
        _count: { id: true }
      }),
      prisma.whatsAppMessage.groupBy({
        by: ["sentBy"],
        where: {
          tenantId: req.user.tenantId,
          sentBy: { in: userIds }
        },
        _count: { id: true }
      }),
      prisma.sMSMessage.groupBy({
        by: ["sentBy"],
        where: {
          tenantId: req.user.tenantId,
          sentBy: { in: userIds }
        },
        _count: { id: true }
      }),
      prisma.securityEvent.findMany({
        where: {
          tenantId: req.user.tenantId,
          userId: { in: userIds },
          action: "LOGIN",
          status: "SUCCESS"
        },
        orderBy: { timestamp: "desc" },
        distinct: ["userId"],
        select: { userId: true, timestamp: true }
      }),
      prisma.securityEvent.findMany({
        where: {
          tenantId: req.user.tenantId,
          userId: { in: userIds },
          action: "LOGOUT",
          status: "SUCCESS"
        },
        orderBy: { timestamp: "desc" },
        distinct: ["userId"],
        select: { userId: true, timestamp: true }
      })
    ]);

    const leadTotalMap = new Map<number, number>();
    totalLeadsByAssignee.forEach((item) => {
      if (item.assignedTo) {
        leadTotalMap.set(item.assignedTo, item._count.id);
      }
    });

    const leadStatusMap = new Map<number, Record<string, number>>();
    leadsByStatus.forEach((item) => {
      if (!item.assignedTo) return;
      if (!leadStatusMap.has(item.assignedTo)) {
        leadStatusMap.set(item.assignedTo, {});
      }
      leadStatusMap.get(item.assignedTo)![item.status] = item._count.id;
    });

    const leadPriorityMap = new Map<number, Record<string, number>>();
    leadsByPriority.forEach((item) => {
      if (!item.assignedTo) return;
      if (!leadPriorityMap.has(item.assignedTo)) {
        leadPriorityMap.set(item.assignedTo, {});
      }
      leadPriorityMap.get(item.assignedTo)![item.priority] = item._count.id;
    });

    const todayFollowupsMap = new Map<number, number>();
    todayFollowupsByAssignee.forEach((item) => {
      if (item.assignedTo) {
        todayFollowupsMap.set(item.assignedTo, item._count.id);
      }
    });

    const missedFollowupsMap = new Map<number, number>();
    missedFollowupsByAssignee.forEach((item) => {
      if (item.assignedTo) {
        missedFollowupsMap.set(item.assignedTo, item._count.id);
      }
    });

    const whatsappMap = new Map<number, number>();
    whatsappByUser.forEach((item) => whatsappMap.set(item.sentBy, item._count.id));
    const smsMap = new Map<number, number>();
    smsByUser.forEach((item) => smsMap.set(item.sentBy, item._count.id));
    const lastSeenMap = new Map<number, Date>();
    lastRequests.forEach((item) => {
      if (item.userId && item._max.createdAt) {
        lastSeenMap.set(item.userId, item._max.createdAt);
      }
    });
    const requests24hMap = new Map<number, number>();
    requestCounts24h.forEach((item) => {
      if (item.userId) {
        requests24hMap.set(item.userId, item._count.id);
      }
    });
    const loginMap = new Map<number, Date>();
    logins.forEach((item) => {
      if (item.userId) loginMap.set(item.userId, item.timestamp);
    });
    const logoutMap = new Map<number, Date>();
    logouts.forEach((item) => {
      if (item.userId) logoutMap.set(item.userId, item.timestamp);
    });

    const totalTenantLeads = await prisma.lead.count({
      where: { tenantId: req.user.tenantId }
    });
    const totalTenantUsers = users.length;
    const totalTenantActivities = activitiesByUser[0]?._count.id ?? 0;

    const insights = users.map((user) => {
      const lastSeenAt = lastSeenMap.get(user.id) ?? null;
      const lastLoginAt = loginMap.get(user.id) ?? null;
      const lastLogoutAt = logoutMap.get(user.id) ?? null;
      const loggedInAfterLogout =
        Boolean(lastLoginAt && (!lastLogoutAt || lastLoginAt > lastLogoutAt));
      const isActive = Boolean(
        (lastSeenAt && lastSeenAt >= activeThreshold) ||
          (loggedInAfterLogout && lastLoginAt && lastLoginAt >= recentWindow)
      );

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        },
        session: {
          status: isActive ? "ACTIVE" : "OFFLINE",
          lastSeenAt,
          lastLoginAt,
          lastLogoutAt,
          requestsLast24h: requests24hMap.get(user.id) ?? 0
        },
        dashboardData: {
          assignedLeads:
            user.role === "TENANT_ADMIN" ? totalTenantLeads : leadTotalMap.get(user.id) ?? 0,
          todayFollowups: todayFollowupsMap.get(user.id) ?? 0,
          missedFollowups: missedFollowupsMap.get(user.id) ?? 0,
          statusBifurcation: leadStatusMap.get(user.id) ?? {},
          priorityBifurcation: leadPriorityMap.get(user.id) ?? {},
          communication: {
            whatsappMessages: whatsappMap.get(user.id) ?? 0,
            smsMessages: smsMap.get(user.id) ?? 0
          }
        }
      };
    });

    return res.json({
      tenantSummary: {
        totalUsers: totalTenantUsers,
        totalLeads: totalTenantLeads,
        totalActivities: totalTenantActivities,
        activeUsers: insights.filter((item) => item.session.status === "ACTIVE").length,
        offlineUsers: insights.filter((item) => item.session.status === "OFFLINE").length
      },
      users: insights
    });
  })
);

router.post(
  "/team",
  asyncHandler(async (req, res) => {
    if (!req.user || (req.user.role !== Role.TENANT_ADMIN && req.user.role !== Role.ADMIN)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    const parsed = createTeamMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid user payload", errors: parsed.error.flatten() });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        tenantId: req.user.tenantId,
        email: parsed.data.email.toLowerCase()
      }
    });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists in this tenant" });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    if (!tenant || !tenant.isActive) {
      return res.status(400).json({ message: "Tenant is inactive" });
    }

    const userCount = await prisma.user.count({ where: { tenantId: req.user.tenantId } });
    if (userCount >= tenant.maxUsers) {
      return res.status(400).json({ message: `Tenant user limit (${tenant.maxUsers}) reached` });
    }

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await prisma.user.create({
      data: {
        tenantId: req.user.tenantId,
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        role: parsed.data.role,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    return res.status(201).json({ user, temporaryPassword });
  })
);

router.post(
  "/team/allocate-leads",
  asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== Role.TENANT_ADMIN) {
      return res.status(403).json({ message: "Only tenant admins can allocate leads" });
    }

    const parsed = allocateLeadsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid allocation payload", errors: parsed.error.flatten() });
    }

    const { userId, startLeadNumber, endLeadNumber, pincode, source, confirmReassignment } = parsed.data;

    const assignee = await prisma.user.findFirst({
      where: {
        id: userId,
        tenantId: req.user.tenantId,
        role: { in: [Role.ADMIN, Role.COUNSELOR] }
      },
      select: { id: true, name: true, email: true, role: true }
    });

    if (!assignee) {
      return res.status(404).json({ message: "Target user not found in this tenant" });
    }

    const leadScopeWhere = buildLeadAllocationWhere(req.user.tenantId, { pincode, source });
    const scopeLabel = formatAllocationScope({ pincode, source });

    const totalScopedLeads = await prisma.lead.count({
      where: leadScopeWhere
    });

    if (totalScopedLeads === 0) {
      return res.status(400).json({
        message: scopeLabel
          ? `No leads found for ${scopeLabel}`
          : "No leads found for allocation"
      });
    }

    if (startLeadNumber > totalScopedLeads) {
      return res.status(400).json({
        message: scopeLabel
          ? `Start lead number exceeds available leads for ${scopeLabel} (${totalScopedLeads})`
          : `Start lead number exceeds tenant lead count (${totalScopedLeads})`
      });
    }

    const normalizedEnd = Math.min(endLeadNumber, totalScopedLeads);
    const take = normalizedEnd - startLeadNumber + 1;

    const targetLeads = await prisma.lead.findMany({
      where: leadScopeWhere,
      select: { id: true },
      orderBy: { id: "asc" },
      skip: startLeadNumber - 1,
      take
    });

    const targetLeadIds = targetLeads.map((lead) => lead.id);
    let assignmentResult;
    try {
      assignmentResult = await assignLeadIdsWithHistory({
        tenantId: req.user.tenantId,
        leadIds: targetLeadIds,
        newAssignedTo: assignee.id,
        assignedBy: req.user.id,
        sourceModule: "teams.allocate-leads",
        confirmReassignment,
        batch: {
          pincode: pincode ?? null,
          source: source ?? null,
          startRange: startLeadNumber,
          endRange: normalizedEnd
        },
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null
      });
    } catch (error) {
      if (error instanceof AssignmentConfirmationError) {
        return res.status(error.statusCode).json({
          message: error.message,
          requiresConfirmation: true,
          conflictCount: error.conflicts.length,
          conflicts: error.conflicts.slice(0, 25)
        });
      }
      throw error;
    }

    return res.json({
      success: true,
      message: `Allocated ${assignmentResult.updatedCount} lead(s) to ${assignee.name}${scopeLabel ? ` for ${scopeLabel}` : ""}`,
      allocatedCount: assignmentResult.updatedCount,
      loggedCount: assignmentResult.loggedCount,
      batchId: assignmentResult.batchId,
      range: { startLeadNumber, endLeadNumber: normalizedEnd },
      pincode: pincode ?? null,
      source: source ?? null,
      totalAvailableLeads: totalScopedLeads,
      assignee
    });
  })
);

router.get(
  "/team/allocate-leads/summary",
  asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== Role.TENANT_ADMIN) {
      return res.status(403).json({ message: "Only tenant admins can view allocation summary" });
    }

    const parsed = allocationSummarySchema.safeParse({
      pincode: typeof req.query.pincode === "string" ? req.query.pincode : undefined,
      source: typeof req.query.source === "string" ? req.query.source : undefined
    });
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid allocation summary query", errors: parsed.error.flatten() });
    }

    const { pincode, source } = parsed.data;
    const totalLeads = await prisma.lead.count({
      where: buildLeadAllocationWhere(req.user.tenantId, { pincode, source })
    });

    return res.json({
      pincode: pincode ?? null,
      source: source ?? null,
      availableLeads: totalLeads
    });
  })
);

router.get(
  "/team/allocate-leads/pincode-summary",
  asyncHandler(async (req, res) => {
    if (!req.user || req.user.role !== Role.TENANT_ADMIN) {
      return res.status(403).json({ message: "Only tenant admins can view allocation summary" });
    }

    const pincode = typeof req.query.pincode === "string" ? req.query.pincode.trim() : "";
    if (!pincode) {
      return res.status(400).json({ message: "pincode query parameter is required" });
    }

    const totalLeads = await prisma.lead.count({
      where: {
        tenantId: req.user.tenantId,
        pincode
      }
    });

    return res.json({
      pincode,
      availableLeads: totalLeads
    });
  })
);

export default router;
