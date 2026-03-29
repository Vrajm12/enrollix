import { LeadStatus, Priority, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const leadBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
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
    const where =
      req.user?.role === Role.COUNSELOR
        ? { OR: [{ assignedTo: req.user.id }, { assignedTo: null }] }
        : {};

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

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const leadId = parseLeadId(req.params.id);
    if (!leadId) {
      return res.status(400).json({ message: "Invalid lead id" });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        assignedCounselor: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (
      req.user?.role === Role.COUNSELOR &&
      lead.assignedTo &&
      lead.assignedTo !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied for this lead" });
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

    const created = await prisma.lead.create({
      data: {
        name: payload.name,
        phone: payload.phone,
        email: toNullable(payload.email),
        address: toNullable(payload.address),
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
      return res.status(400).json({ message: "Invalid lead id" });
    }

    const parsed = leadBaseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid lead payload",
        errors: parsed.error.flatten()
      });
    }

    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (
      req.user?.role === Role.COUNSELOR &&
      existingLead.assignedTo &&
      existingLead.assignedTo !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied for this lead" });
    }

    const payload = parsed.data;
    const assignedTo =
      req.user?.role === Role.COUNSELOR ? req.user.id : payload.assignedTo ?? null;

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: {
        name: payload.name,
        phone: payload.phone,
        email: toNullable(payload.email),
        address: toNullable(payload.address),
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
      return res.status(400).json({ message: "Invalid lead id" });
    }

    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid status payload",
        errors: parsed.error.flatten()
      });
    }

    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (
      req.user?.role === Role.COUNSELOR &&
      existingLead.assignedTo &&
      existingLead.assignedTo !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied for this lead" });
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
      return res.status(400).json({ message: "Invalid lead id" });
    }

    const parsed = prioritySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid priority payload",
        errors: parsed.error.flatten()
      });
    }

    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (
      req.user?.role === Role.COUNSELOR &&
      existingLead.assignedTo &&
      existingLead.assignedTo !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied for this lead" });
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
      return res.status(400).json({ message: "Invalid lead id" });
    }

    const parsed = followupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid followup payload",
        errors: parsed.error.flatten()
      });
    }

    const existingLead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existingLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    if (
      req.user?.role === Role.COUNSELOR &&
      existingLead.assignedTo &&
      existingLead.assignedTo !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied for this lead" });
    }

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { nextFollowUp: new Date(parsed.data.nextFollowUp) }
    });

    return res.json(updated);
  })
);

export default router;
