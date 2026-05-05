import { ActivityType, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { validateResourceTenant } from "../utils/tenantHelper.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const createActivitySchema = z.object({
  leadId: z.coerce.number().int().positive(),
  type: z.nativeEnum(ActivityType),
  notes: z.string().trim().min(1, "Notes are required"),
  nextFollowUp: z
    .string()
    .min(1, "Next follow-up date is mandatory")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Invalid next follow-up date"
    })
}).strip();

const parseLeadId = (idParam: string) => {
  const id = Number(idParam);
  return Number.isNaN(id) || id <= 0 ? null : id;
};

router.post(
  "/",
  asyncHandler(async (req, res) => {
    // ✅ CRITICAL: Extract leadId first to check tenant access early
    const leadId = req.body?.leadId;
    if (!leadId || typeof leadId !== "number" || leadId <= 0) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Fetch lead and check tenant BEFORE validating other payload fields
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Check tenant access IMMEDIATELY (before payload validation)
    if (!validateResourceTenant(req.user!.tenantId, lead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user?.role === Role.COUNSELOR &&
      lead.assignedTo &&
      lead.assignedTo !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // ✅ NOW validate entire payload (after confirming user has access to the lead)
    const parsed = createActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid activity payload",
        errors: parsed.error.flatten()
      });
    }

    const created = await prisma.activity.create({
      data: {
        tenantId: req.user!.tenantId,
        leadId: parsed.data.leadId,
        type: parsed.data.type,
        notes: parsed.data.notes,
        nextFollowUp: new Date(parsed.data.nextFollowUp)
      }
    });

    return res.status(201).json(created);
  })
);

router.get(
  "/:lead_id",
  asyncHandler(async (req, res) => {
    const leadId = parseLeadId(req.params.lead_id);
    if (!leadId) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Fetch lead and check tenant IMMEDIATELY (before returning activity data)
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // ✅ CRITICAL: Check tenant access FIRST
    if (!validateResourceTenant(req.user!.tenantId, lead.tenantId, req.user?.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    if (
      req.user?.role === Role.COUNSELOR &&
      lead.assignedTo &&
      lead.assignedTo !== req.user.id
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const activities = await prisma.activity.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" }
    });

    return res.json(activities);
  })
);

export default router;
