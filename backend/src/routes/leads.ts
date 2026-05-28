import { LeadStatus, Priority, Prisma, Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { validateResourceTenant, validateUserTenant } from "../utils/tenantHelper.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { invalidateDashboardSummaryCache } from "../services/dashboardSummaryCache.js";

const router = Router();

const STUDENT_CASTE_CATEGORIES = [
  "DT/VJ",
  "NT-B",
  "NT-C",
  "NT-D",
  "OBC",
  "SBC",
  "SEBC",
  "OPEN",
  "SC",
  "ST"
] as const;

const leadBaseSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  region: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  locality: z.string().trim().optional().or(z.literal("")),
  pincode: z.string().trim().optional().or(z.literal("")),
  studentCasteCategory: z.enum(STUDENT_CASTE_CATEGORIES).optional().or(z.literal("")),
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

const normalizeFilterToken = (value: string) => value.trim().toLowerCase();

const cityAliases: Record<string, string[]> = {
  dharashiv: ["dharashiv", "osmanabad"],
  osmanabad: ["dharashiv", "osmanabad"],
  "dharashiv(osmanabad)": ["dharashiv", "osmanabad"],
  "dharashiv (osmanabad)": ["dharashiv", "osmanabad"],
  ahilyanagar: ["ahilyanagar", "ahmednagar"],
  ahmednagar: ["ahilyanagar", "ahmednagar"],
  "chhatrapati sambhajinagar": ["chhatrapati sambhajinagar", "aurangabad"],
  aurangabad: ["chhatrapati sambhajinagar", "aurangabad"]
};

const expandCityFilterTerms = (rawCity: string) => {
  const normalized = normalizeFilterToken(rawCity);
  const noParen = normalized.replace(/\s*\([^)]*\)\s*/g, "").trim();
  const direct = cityAliases[normalized] ?? cityAliases[noParen];
  if (direct) return direct;
  return [noParen || normalized];
};

const parseLeadId = (idParam: string) => {
  const id = Number(idParam);
  return Number.isNaN(id) || id <= 0 ? null : id;
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const paginated = String(req.query.paginated ?? "").toLowerCase() === "true";
    const cursorRaw = typeof req.query.cursor === "string" ? req.query.cursor : "";
    const cursorId = cursorRaw ? Number(cursorRaw) : null;
    const validCursor = cursorId && Number.isFinite(cursorId) && cursorId > 0 ? cursorId : null;
    const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
    const pageSizeRaw = Number(req.query.pageSize ?? 50) || 50;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 200);
    const statusQuery = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
    const searchQuery = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const stateQuery =
      typeof req.query.state === "string"
        ? req.query.state.trim()
        : typeof req.query.region === "string"
          ? req.query.region.trim()
          : "";
    const city = typeof req.query.city === "string" ? req.query.city.trim() : "";
    const locality = typeof req.query.locality === "string" ? req.query.locality.trim() : "";
    const pincode = typeof req.query.pincode === "string" ? req.query.pincode.trim() : "";
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
      const cityTerms = expandCityFilterTerms(city);
      andFilters.push({
        OR: [
          ...cityTerms.map((term) => ({ city: { contains: term, mode: "insensitive" as const } })),
          ...cityTerms.map((term) => ({ address: { contains: term, mode: "insensitive" as const } }))
        ]
      });
    }

    if (course) {
      andFilters.push({
        course: { contains: course, mode: "insensitive" }
      });
    }

    if (pincode) {
      andFilters.push({
        pincode: { contains: pincode, mode: "insensitive" }
      });
    }

    if (locality) {
      andFilters.push({
        OR: [
          { locality: { contains: locality, mode: "insensitive" } },
          { address: { contains: locality, mode: "insensitive" } }
        ]
      });
    }

    if (searchQuery) {
      andFilters.push({
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { phone: { contains: searchQuery, mode: "insensitive" } },
          { email: { contains: searchQuery, mode: "insensitive" } },
          { course: { contains: searchQuery, mode: "insensitive" } },
          { city: { contains: searchQuery, mode: "insensitive" } },
          { locality: { contains: searchQuery, mode: "insensitive" } }
        ]
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const statusWhere =
      statusQuery && Object.values(LeadStatus).includes(statusQuery as LeadStatus)
        ? { ...where, status: statusQuery as LeadStatus }
        : where;

    if (!paginated) {
      const leads = await prisma.lead.findMany({
        where: statusWhere,
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
    }

    const [items, total, groupedCounts] = await Promise.all([
      prisma.lead.findMany({
        where: statusWhere,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          region: true,
          city: true,
          locality: true,
          pincode: true,
          studentCasteCategory: true,
          parentContact: true,
          course: true,
          source: true,
          status: true,
          priority: true,
          nextFollowUp: true,
          assignedTo: true,
          assignedCounselor: {
            select: { id: true, name: true, email: true }
          },
          createdAt: true,
          updatedAt: true
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        ...(validCursor
          ? {
              cursor: { id: validCursor },
              skip: 1,
              take: pageSize
            }
          : {
              skip: (page - 1) * pageSize,
              take: pageSize
            })
      }),
      prisma.lead.count({ where: statusWhere }),
      prisma.lead.groupBy({
        by: ["status"],
        where,
        _count: { _all: true }
      })
    ]);

    const counts = groupedCounts.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {});

    const nextCursor = items.length === pageSize ? items[items.length - 1]?.id ?? null : null;

    return res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
      counts,
      nextCursor
    });
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
    invalidateDashboardSummaryCache(req.user!.tenantId);

    return res.json({
      message: "Leads deleted successfully",
      deletedCount: result.count,
      requestedCount: leadIds.length
    });
  })
);

router.get(
  "/meta/pincodes",
  asyncHandler(async (req, res) => {
    const where: Prisma.LeadWhereInput =
      req.user?.role === Role.TENANT_ADMIN || req.user?.role === Role.SUPER_ADMIN
        ? { tenantId: req.user!.tenantId, pincode: { not: null } }
        : { tenantId: req.user!.tenantId, assignedTo: req.user!.id, pincode: { not: null } };

    const rows = await prisma.lead.findMany({
      where,
      select: { pincode: true },
      distinct: ["pincode"],
      orderBy: { pincode: "asc" }
    });

    return res.json({
      pincodes: rows.map((row) => row.pincode).filter((value): value is string => Boolean(value))
    });
  })
);

router.get(
  "/meta/localities",
  asyncHandler(async (req, res) => {
    const where: Prisma.LeadWhereInput =
      req.user?.role === Role.TENANT_ADMIN || req.user?.role === Role.SUPER_ADMIN
        ? { tenantId: req.user!.tenantId, locality: { not: null } }
        : { tenantId: req.user!.tenantId, assignedTo: req.user!.id, locality: { not: null } };

    const rows = await prisma.lead.findMany({
      where,
      select: { locality: true },
      distinct: ["locality"],
      orderBy: { locality: "asc" }
    });

    return res.json({
      localities: rows.map((row) => row.locality).filter((value): value is string => Boolean(value))
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
        locality: toNullable(payload.locality),
        pincode: toNullable(payload.pincode),
        studentCasteCategory: toNullable(payload.studentCasteCategory),
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
    invalidateDashboardSummaryCache(req.user!.tenantId);

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
        locality: toNullable(payload.locality),
        pincode: toNullable(payload.pincode),
        studentCasteCategory: toNullable(payload.studentCasteCategory),
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
    invalidateDashboardSummaryCache(req.user!.tenantId);

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
    invalidateDashboardSummaryCache(req.user!.tenantId);

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
    invalidateDashboardSummaryCache(req.user!.tenantId);

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
    invalidateDashboardSummaryCache(req.user!.tenantId);

    return res.json(updated);
  })
);

export default router;
