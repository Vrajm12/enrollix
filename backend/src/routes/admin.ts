import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isMissingApiRequestLogTableError } from "../utils/prismaErrors.js";
import {
  AssignmentConfirmationError,
  restoreAssignmentsFromBatch
} from "../services/leadAssignmentService.js";

const router = Router();
const courseOptionsSchema = z.array(z.string().trim().min(1).max(100)).max(200);

// Validation schemas
const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  courseOptions: courseOptionsSchema.default([]),
  maxUsers: z.number().int().min(1).default(10)
});

const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  courseOptions: courseOptionsSchema.optional(),
  maxUsers: z.number().int().min(1).optional()  ,
  isActive: z.boolean().optional()
});

const createTenantUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(12).optional(),
  role: z.enum(["COUNSELOR", "ADMIN", "TENANT_ADMIN"]).default("COUNSELOR")
});

const updateTenantUserSchema = z.object({
  role: z.enum(["COUNSELOR", "ADMIN", "TENANT_ADMIN"]).optional(),
  name: z.string().min(1).optional()
});
const monitoringQuerySchema = z.object({
  hours: z.coerce.number().int().min(1).max(24 * 30).optional().default(24),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
  tenantId: z.coerce.number().int().min(1).optional(),
  status: z.coerce.number().int().min(100).max(599).optional()
});
const assignmentHistoryQuerySchema = z.object({
  tenantId: z.coerce.number().int().min(1),
  userId: z.coerce.number().int().min(1),
  mode: z.enum(["assignedTo", "assignedBy", "all"]).optional().default("all"),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100)
});
const restoreAssignmentBatchSchema = z.object({
  apply: z.boolean().optional().default(false),
  confirmReassignment: z.boolean().optional().default(false)
});

// Only SUPER_ADMIN can access these routes
const adminAuth = [requireAuth, requireRole(["SUPER_ADMIN"])];

const generateTemporaryPassword = (length = 14) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let password = "";
  for (let i = 0; i < length; i += 1) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${password}A1!`;
};

/**
 * GET /admin/tenants
 * List all tenants (SUPER_ADMIN only)
 */
router.get(
  "/tenants",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const tenants = await prisma.tenant.findMany({
      include: {
        _count: {
          select: { users: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({
      tenants: tenants.map(tenant => ({
        ...tenant,
        userCount: tenant._count.users,
        _count: undefined
      }))
    });
  })
);

/**
 * GET /admin/tenants/:id
 * Get a single tenant details (SUPER_ADMIN only)
 */
router.get(
  "/tenants/:id",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
          }
        },
        _count: {
          select: { leads: true, users: true }
        }
      }
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    return res.json({ tenant });
  })
);

/**
 * POST /admin/tenants
 * Create a new tenant (SUPER_ADMIN only)
 */
router.post(
  "/tenants",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const parsed = createTenantSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid tenant payload",
        errors: parsed.error.flatten()
      });
    }

    // Check if slug already exists
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: parsed.data.slug }
    });

    if (existingTenant) {
      return res.status(400).json({
        message: "Tenant slug already exists"
      });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description,
        courseOptions: Array.from(new Set(parsed.data.courseOptions.map((value) => value.trim()))),
        maxUsers: parsed.data.maxUsers
      }
    });

    return res.status(201).json({ tenant });
  })
);

/**
 * PATCH /admin/tenants/:id
 * Update tenant details (SUPER_ADMIN only)
 */
router.patch(
  "/tenants/:id",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const parsed = updateTenantSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid tenant payload",
        errors: parsed.error.flatten()
      });
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...parsed.data,
        ...(parsed.data.courseOptions
          ? {
              courseOptions: Array.from(
                new Set(parsed.data.courseOptions.map((value) => value.trim()))
              )
            }
          : {})
      }
    });

    return res.json({ tenant });
  })
);

/**
 * DELETE /admin/tenants/:id
 * Soft delete a tenant (SUPER_ADMIN only)
 */
router.delete(
  "/tenants/:id",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);

    // Soft delete by marking as inactive
    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: false }
    });

    return res.json({
      message: "Tenant deactivated successfully",
      tenant
    });
  })
);

/**
 * POST /admin/tenants/:id/users
 * Create a user for a tenant (SUPER_ADMIN only)
 */
router.post(
  "/tenants/:id/users",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const parsed = createTenantUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid user payload",
        errors: parsed.error.flatten()
      });
    }

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Check if email already exists in this tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        email: parsed.data.email.toLowerCase(),
        tenantId
      }
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists in this tenant"
      });
    }

    // Check tenant user limit
    const userCount = await prisma.user.count({
      where: { tenantId }
    });

    if (userCount >= tenant.maxUsers) {
      return res.status(400).json({
        message: `Tenant user limit (${tenant.maxUsers}) reached`
      });
    }

    const temporaryPassword = parsed.data.password ?? generateTemporaryPassword();
    // Hash password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name,
        password: hashedPassword,
        role: parsed.data.role
      }
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return res.status(201).json({
      user: userWithoutPassword,
      temporaryPassword
    });
  })
);

/**
 * DELETE /admin/tenants/:id/permanent
 * Permanently delete a tenant and all related records
 */
router.delete(
  "/tenants/:id/permanent",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id, 10);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    await prisma.tenant.delete({
      where: { id: tenantId }
    });

    return res.json({
      message: "Tenant deleted permanently"
    });
  })
);

/**
 * GET /admin/tenants/:id/users
 * List users for a tenant (SUPER_ADMIN only)
 */
router.get(
  "/tenants/:id/users",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);

    // Check if tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId }
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json({ users });
  })
);

/**
 * PATCH /admin/tenants/:id/users/:userId
 * Update user role or name (SUPER_ADMIN only)
 */
router.patch(
  "/tenants/:id/users/:userId",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const parsed = updateTenantUserSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid user payload",
        errors: parsed.error.flatten()
      });
    }

    // Verify user belongs to tenant
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found in this tenant" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return res.json({ user: updatedUser });
  })
);

/**
 * DELETE /admin/tenants/:id/users/:userId
 * Remove a user from a tenant (SUPER_ADMIN only)
 */
router.delete(
  "/tenants/:id/users/:userId",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    // Verify user belongs to tenant
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found in this tenant" });
    }

    // Delete user
    await prisma.user.delete({
      where: { id: userId }
    });

    return res.json({
      message: "User deleted successfully"
    });
  })
);

/**
 * GET /admin/monitoring/overview
 * High-level usage and health metrics for superadmin
 */
router.get(
  "/monitoring/overview",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const parsed = monitoringQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid monitoring query params" });
    }
    const { hours } = parsed.data;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      const [totalRequests, totalErrors, avgDurationData, mostUsedTenants, topEndpoints, latestErrors] =
        await Promise.all([
          prisma.apiRequestLog.count({ where: { createdAt: { gte: since } } }),
          prisma.apiRequestLog.count({
            where: { createdAt: { gte: since }, statusCode: { gte: 400 } }
          }),
          prisma.apiRequestLog.aggregate({
            where: { createdAt: { gte: since } },
            _avg: { durationMs: true }
          }),
          prisma.apiRequestLog.groupBy({
            by: ["tenantId"],
            where: { createdAt: { gte: since }, tenantId: { not: null } },
            _count: { id: true },
            orderBy: { _count: { id: "desc" } },
            take: 10
          }),
          prisma.apiRequestLog.groupBy({
            by: ["path"],
            where: { createdAt: { gte: since } },
            _count: { id: true },
            _avg: { durationMs: true },
            orderBy: { _count: { id: "desc" } },
            take: 10
          }),
          prisma.apiRequestLog.findMany({
            where: { createdAt: { gte: since }, statusCode: { gte: 400 } },
            orderBy: { createdAt: "desc" },
            take: 30
          })
        ]);

      const tenantIds = mostUsedTenants
        .map((item) => item.tenantId)
        .filter((tenantId): tenantId is number => tenantId !== null);
      const tenants = tenantIds.length
        ? await prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true, slug: true, isActive: true }
          })
        : [];
      const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant]));

      return res.json({
        overview: {
          windowHours: hours,
          totalRequests,
          totalErrors,
          errorRatePercent: totalRequests ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : 0,
          avgDurationMs: Number((avgDurationData._avg.durationMs ?? 0).toFixed(1))
        },
        mostUsedTenants: mostUsedTenants.map((item) => ({
          tenantId: item.tenantId,
          tenantName: item.tenantId ? tenantMap.get(item.tenantId)?.name ?? "Unknown tenant" : "Unknown",
          tenantSlug: item.tenantId ? tenantMap.get(item.tenantId)?.slug ?? null : null,
          isActive: item.tenantId ? tenantMap.get(item.tenantId)?.isActive ?? false : false,
          requestCount: item._count.id
        })),
        topEndpoints: topEndpoints.map((item) => ({
          path: item.path,
          requestCount: item._count.id,
          avgDurationMs: Number((item._avg.durationMs ?? 0).toFixed(1))
        })),
        latestErrors,
        monitoringDisabled: false
      });
    } catch (error: unknown) {
      if (!isMissingApiRequestLogTableError(error)) {
        throw error;
      }
      return res.json({
        overview: {
          windowHours: hours,
          totalRequests: 0,
          totalErrors: 0,
          errorRatePercent: 0,
          avgDurationMs: 0
        },
        mostUsedTenants: [],
        topEndpoints: [],
        latestErrors: [],
        monitoringDisabled: true
      });
    }
  })
);

/**
 * GET /admin/monitoring/requests
 * Detailed request logs with filters
 */
router.get(
  "/monitoring/requests",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const parsed = monitoringQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid monitoring query params" });
    }
    const { hours, limit, tenantId, status } = parsed.data;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    let requests;
    try {
      requests = await prisma.apiRequestLog.findMany({
        where: {
          createdAt: { gte: since },
          ...(tenantId ? { tenantId } : {}),
          ...(status ? { statusCode: status } : {})
        },
        orderBy: { createdAt: "desc" },
        take: limit
      });
    } catch (error: unknown) {
      if (!isMissingApiRequestLogTableError(error)) {
        throw error;
      }
      return res.json({ requests: [], monitoringDisabled: true });
    }

    const ids = Array.from(new Set(requests.map((item) => item.tenantId).filter((value): value is number => value !== null)));
    const tenants = ids.length
      ? await prisma.tenant.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true, slug: true }
        })
      : [];
    const tenantMap = new Map(tenants.map((tenant) => [tenant.id, tenant]));

    return res.json({
      requests: requests.map((item) => ({
        ...item,
        tenantName: item.tenantId ? tenantMap.get(item.tenantId)?.name ?? "Unknown tenant" : "Unknown"
      }))
    });
  })
);

router.get(
  "/lead-assignments/history",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const parsed = assignmentHistoryQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid assignment history query params", errors: parsed.error.flatten() });
    }

    const { tenantId, userId, mode, limit } = parsed.data;
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, name: true, email: true, role: true }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found in tenant" });
    }

    const involvementWhere =
      mode === "assignedTo"
        ? { OR: [{ oldAssignedTo: userId }, { newAssignedTo: userId }] }
        : mode === "assignedBy"
          ? { assignedBy: userId }
          : { OR: [{ oldAssignedTo: userId }, { newAssignedTo: userId }, { assignedBy: userId }] };

    const logs = await prisma.leadAssignmentLog.findMany({
      where: {
        tenantId,
        ...involvementWhere
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    const relatedUserIds = Array.from(
      new Set(
        logs
          .flatMap((log) => [log.oldAssignedTo, log.newAssignedTo, log.assignedBy])
          .filter((value): value is number => value !== null)
      )
    );
    const relatedUsers = relatedUserIds.length
      ? await prisma.user.findMany({
          where: { tenantId, id: { in: relatedUserIds } },
          select: { id: true, name: true, email: true, role: true }
        })
      : [];
    const userMap = new Map(relatedUsers.map((item) => [item.id, item]));

    const batchIds = Array.from(new Set(logs.map((log) => log.batchId).filter((value): value is string => value !== null)));
    const batches = batchIds.length
      ? await prisma.leadAssignmentBatch.findMany({
          where: { tenantId, batchId: { in: batchIds } }
        })
      : [];
    const batchMap = new Map(batches.map((batch) => [batch.batchId, batch]));

    return res.json({
      user,
      mode,
      logs: logs.map((log) => ({
        ...log,
        oldAssignee: log.oldAssignedTo ? userMap.get(log.oldAssignedTo) ?? null : null,
        newAssignee: log.newAssignedTo ? userMap.get(log.newAssignedTo) ?? null : null,
        assignedByUser: log.assignedBy ? userMap.get(log.assignedBy) ?? null : null,
        batch: log.batchId ? batchMap.get(log.batchId) ?? null : null
      }))
    });
  })
);

router.post(
  "/lead-assignment-batches/:batchId/restore",
  ...adminAuth,
  asyncHandler(async (req, res) => {
    const parsed = restoreAssignmentBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid restore payload", errors: parsed.error.flatten() });
    }

    const batch = await prisma.leadAssignmentBatch.findUnique({
      where: { batchId: req.params.batchId }
    });
    if (!batch) {
      return res.status(404).json({ message: "Assignment batch not found" });
    }

    try {
      const result = await restoreAssignmentsFromBatch({
        tenantId: batch.tenantId,
        batchId: batch.batchId,
        assignedBy: req.user!.id,
        confirmReassignment: parsed.data.confirmReassignment,
        apply: parsed.data.apply,
        sourceModule: "admin.lead-assignment-batches.restore",
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null
      });

      return res.json(result);
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
  })
);

export default router;
