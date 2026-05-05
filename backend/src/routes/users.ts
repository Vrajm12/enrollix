import { Role } from "@prisma/client";
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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
  endLeadNumber: z.number().int().positive()
}).refine((payload) => payload.endLeadNumber >= payload.startLeadNumber, {
  message: "endLeadNumber must be greater than or equal to startLeadNumber",
  path: ["endLeadNumber"]
});

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

    const { userId, startLeadNumber, endLeadNumber } = parsed.data;

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

    const totalTenantLeads = await prisma.lead.count({
      where: { tenantId: req.user.tenantId }
    });

    if (startLeadNumber > totalTenantLeads) {
      return res.status(400).json({
        message: `Start lead number exceeds tenant lead count (${totalTenantLeads})`
      });
    }

    const normalizedEnd = Math.min(endLeadNumber, totalTenantLeads);
    const take = normalizedEnd - startLeadNumber + 1;

    const targetLeads = await prisma.lead.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true },
      orderBy: { id: "asc" },
      skip: startLeadNumber - 1,
      take
    });

    const targetLeadIds = targetLeads.map((lead) => lead.id);
    const result = targetLeadIds.length === 0
      ? { count: 0 }
      : await prisma.lead.updateMany({
          where: {
            tenantId: req.user.tenantId,
            id: { in: targetLeadIds }
          },
          data: {
            assignedTo: assignee.id
          }
        });

    return res.json({
      success: true,
      message: `Allocated ${result.count} lead(s) to ${assignee.name}`,
      allocatedCount: result.count,
      range: { startLeadNumber, endLeadNumber: normalizedEnd },
      totalTenantLeads,
      assignee
    });
  })
);

export default router;
