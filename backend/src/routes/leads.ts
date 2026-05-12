import { LeadStatus, Priority, Prisma, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { validateResourceTenant, validateUserTenant } from "../utils/tenantHelper.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const leadBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  region: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  parentContact: z.string().trim().optional().or(z.literal("")),
  course: z.string().trim().optional().or(z.literal("")),
  source: z.string().trim().optional().or(z.literal("")),
  assignedTo: z.coerce.number().int().positive().optional().nullable(),
  status: z.nativeEnum(LeadStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  nextFollowUp: z.string().datetime().optional().nullable()
}).strip();

const statusSchema = z.object({
  status: z.nativeEnum(LeadStatus)
}).strip();

const prioritySchema = z.object({
  priority: z.nativeEnum(Priority)
}).strip();

const followupSchema = z.object({
  nextFollowUp: z.string().datetime()
}).strip();

const bulkDeleteSchema = z.object({
  leadIds: z.array(z.coerce.number().int().positive()).min(1).max(500)
}).strip();

const toNullable = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const parseLeadId = (idParam: string) => {
  const id = Number(idParam);
  return Number.isNaN(id) || id <= 0 ? null : id;
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const stateQuery =
      typeof req.query.state === "string"
        ? req.query.state.trim()
        : typeof req.query.region === "string"
          ? req.query.region.trim()
          : "";
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
    const course = typeof req.query.course === "string" ? req.query.course.trim() : "";
    const tenantFilter = { tenantId: req.user!.tenantId };

    const baseWhere =
      req.user?.role === Role.TENANT_ADMIN || req.user?.role === Role.SUPER_ADMIN
        ? tenantFilter
        : {
            ...tenantFilter,
            assignedTo: req.user!.id
          };

    const where: Prisma.LeadWhereInput = { ...baseWhere };
    const andFilters: Prisma.LeadWhereInput[] = [];

    if (stateQuery) {
      andFilters.push({
        OR: [
          { region: { contains: stateQuery, mode: "insensitive" } },
          { address: { contains: stateQuery, mode: "insensitive" } }
        ]
      });
    }

    if (city) {
      andFilters.push({
        OR: [
          { city: { contains: city, mode: "insensitive" } },
          { address: { contains: city, mode: "insensitive" } }
        ]
      });
    }

    if (course) {
      andFilters.push({
        course: { contains: course, mode: "insensitive" }
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedCounselor: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { activities: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(leads);
  })
);

router.delete(
  "/bulk-delete",
  asyncHandler(async (req, res) => {
    if (req.user?.role !== Role.TENANT_ADMIN && req.user?.role !== Role.SUPER_ADMIN) {
      return res.status(403).json({ message: "Only tenant admins can delete leads in bulk" });
    }

    const parsed = bulkDeleteSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid bulk delete payload",
        errors: parsed.error.flatten()
      });
    }

    const leadIds = Array.from(new Set(parsed.data.leadIds));

    const result = await prisma.lead.deleteMany({
      where: {
        tenantId: req.user!.tenantId,
        id: { in: leadIds }
      }
    });

    return res.json({
      message: "Leads deleted successfully",
      deletedCount: result.count,
      requestedCount: leadIds.length
    });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const leadId = parseLeadId(req.params.id);
    if (!leadId) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Fetch lead first
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedCounselor: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // ✅ CRITICAL: Check tenant access IMMEDIATELY (before any other logic)
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (!validateResourceTenant(req.user!.tenantId, lead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user?.role !== Role.TENANT_ADMIN &&
      req.user?.role !== Role.SUPER_ADMIN &&
      lead.assignedTo !== req.user?.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json(lead);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const parsed = leadBaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid lead payload",
        errors: parsed.error.flatten()
      });
    }

    const payload = parsed.data;
    const assignedTo =
      req.user?.role === Role.COUNSELOR ? req.user.id : payload.assignedTo ?? null;

    // Validate assigned user belongs to same tenant (if specified)
    if (assignedTo && assignedTo !== req.user?.id) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedTo }
      });

      if (!assignedUser || !validateUserTenant(req.user!.tenantId, assignedUser.tenantId, req.user?.role)) {
        return res.status(400).json({ message: "Invalid assigned user" });
      }
    }

    const created = await prisma.lead.create({
      data: {
        tenantId: req.user!.tenantId,
        name: payload.name,
        phone: payload.phone,
        email: toNullable(payload.email),
        address: toNullable(payload.address),
        region: toNullable(payload.region),
        city: toNullable(payload.city),
        parentContact: toNullable(payload.parentContact),
        course: toNullable(payload.course),
        source: toNullable(payload.source),
        assignedTo,
        status: payload.status ?? LeadStatus.LEAD,
        priority: payload.priority ?? Priority.COLD,
        nextFollowUp: payload.nextFollowUp ? new Date(payload.nextFollowUp) : null
      },
      include: {
        assignedCounselor: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.status(201).json(created);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const leadId = parseLeadId(req.params.id);
    if (!leadId) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Fetch lead and check tenant BEFORE validating payload
    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Check tenant access IMMEDIATELY (before payload validation)
    if (!validateResourceTenant(req.user!.tenantId, existingLead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user?.role !== Role.TENANT_ADMIN &&
      req.user?.role !== Role.SUPER_ADMIN &&
      existingLead.assignedTo !== req.user?.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ NOW validate payload (after confirming user has access)
    const parsed = leadBaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid lead payload",
        errors: parsed.error.flatten()
      });
    }

    const payload = parsed.data;
    const assignedTo =
      req.user?.role === Role.COUNSELOR ? req.user.id : payload.assignedTo ?? null;

    // Validate assigned user belongs to same tenant (if specified)
    if (assignedTo && assignedTo !== req.user?.id) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedTo }
      });

      if (!assignedUser || !validateUserTenant(req.user!.tenantId, assignedUser.tenantId, req.user?.role)) {
        return res.status(403).json({ message: "Invalid assigned user" });
      }
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        name: payload.name,
        phone: payload.phone,
        email: toNullable(payload.email),
        address: toNullable(payload.address),
        region: toNullable(payload.region),
        city: toNullable(payload.city),
        parentContact: toNullable(payload.parentContact),
        course: toNullable(payload.course),
        source: toNullable(payload.source),
        status: payload.status ?? existingLead.status,
        priority: payload.priority ?? existingLead.priority,
        nextFollowUp: payload.nextFollowUp ? new Date(payload.nextFollowUp) : existingLead.nextFollowUp,
        assignedTo
      },
      include: {
        assignedCounselor: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.json(updated);
  })
);

router.patch(
  "/:id/status",
  asyncHandler(async (req, res) => {
    const leadId = parseLeadId(req.params.id);
    if (!leadId) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Fetch lead and check tenant BEFORE validating payload
    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Check tenant access IMMEDIATELY (before payload validation)
    if (!validateResourceTenant(req.user!.tenantId, existingLead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user?.role !== Role.TENANT_ADMIN &&
      req.user?.role !== Role.SUPER_ADMIN &&
      existingLead.assignedTo !== req.user?.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ NOW validate payload (after confirming user has access)
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid status payload",
        errors: parsed.error.flatten()
      });
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { status: parsed.data.status }
    });

    return res.json(updated);
  })
);

router.patch(
  "/:id/priority",
  asyncHandler(async (req, res) => {
    const leadId = parseLeadId(req.params.id);
    if (!leadId) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Fetch lead and check tenant BEFORE validating payload
    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Check tenant access IMMEDIATELY (before payload validation)
    if (!validateResourceTenant(req.user!.tenantId, existingLead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user?.role !== Role.TENANT_ADMIN &&
      req.user?.role !== Role.SUPER_ADMIN &&
      existingLead.assignedTo !== req.user?.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ NOW validate payload (after confirming user has access)
    const parsed = prioritySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid priority payload",
        errors: parsed.error.flatten()
      });
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { priority: parsed.data.priority }
    });

    return res.json(updated);
  })
);

router.patch(
  "/:id/followup",
  asyncHandler(async (req, res) => {
    const leadId = parseLeadId(req.params.id);
    if (!leadId) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Fetch lead and check tenant BEFORE validating payload
    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Check tenant access IMMEDIATELY (before payload validation)
    if (!validateResourceTenant(req.user!.tenantId, existingLead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user?.role !== Role.TENANT_ADMIN &&
      req.user?.role !== Role.SUPER_ADMIN &&
      existingLead.assignedTo !== req.user?.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ NOW validate payload (after confirming user has access)
    const parsed = followupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid followup payload",
        errors: parsed.error.flatten()
      });
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { nextFollowUp: new Date(parsed.data.nextFollowUp) }
    });

    return res.json(updated);
  })
);

export default router;
