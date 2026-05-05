import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

export default router;
