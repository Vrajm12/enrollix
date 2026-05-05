import { Role } from "@prisma/client";
import { Request, Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

const buildLeadAccessWhere = (req: Request) => {
  const tenantFilter = { tenantId: req.user!.tenantId };

  if (req.user?.role !== Role.TENANT_ADMIN && req.user?.role !== Role.SUPER_ADMIN) {
    return {
      ...tenantFilter,
      assignedTo: req.user!.id
    };
  }

  return tenantFilter;
};

// Get today's follow-ups
router.get(
  "/followups",
  asyncHandler(async (req, res) => {
    const dateParam = typeof req.query.date === "string" ? req.query.date : "";
    const page = Math.max(Number(req.query.page ?? 1) || 1, 1);
    const pageSizeRaw = Number(req.query.pageSize ?? 25) || 25;
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);

    const selectedDate = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
    if (Number.isNaN(selectedDate.getTime())) {
      return res.status(400).json({ message: "Invalid date query parameter" });
    }

    selectedDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const accessWhere = buildLeadAccessWhere(req);
    const selectedDateWhere = {
      ...accessWhere,
      nextFollowUp: { gte: selectedDate, lt: nextDay }
    };

    const [items, total, todayCount, missedCount] = await Promise.all([
      prisma.lead.findMany({
        where: selectedDateWhere,
        include: {
          assignedCounselor: {
            select: { id: true, name: true, email: true }
          }
        },
        orderBy: { nextFollowUp: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      prisma.lead.count({ where: selectedDateWhere }),
      prisma.lead.count({
        where: {
          ...accessWhere,
          nextFollowUp: { gte: today, lt: tomorrow }
        }
      }),
      prisma.lead.count({
        where: {
          ...accessWhere,
          nextFollowUp: { lt: today }
        }
      })
    ]);

    return res.json({
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
      counts: {
        selectedDate: total,
        today: todayCount,
        missed: missedCount
      }
    });
  })
);

router.get(
  "/followups/today",
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where = {
      ...buildLeadAccessWhere(req),
      nextFollowUp: { gte: today, lt: tomorrow }
    };

    const followups = await prisma.lead.findMany({
      where,
      include: {
        assignedCounselor: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return res.json(followups);
  })
);

// Get missed follow-ups
router.get(
  "/followups/missed",
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
      ...buildLeadAccessWhere(req),
      nextFollowUp: { lt: today }
    };

    const missed = await prisma.lead.findMany({
      where,
      include: {
        assignedCounselor: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return res.json(missed);
  })
);

// Get all leads grouped by status
router.get(
  "/leads/by-status",
  asyncHandler(async (req, res) => {
    const where = buildLeadAccessWhere(req);

    const leads = await prisma.lead.findMany({
      where,
      include: {
        assignedCounselor: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Group by status
    const grouped = leads.reduce(
      (acc, lead) => {
        if (!acc[lead.status]) {
          acc[lead.status] = [];
        }
        acc[lead.status].push(lead);
        return acc;
      },
      {} as Record<string, typeof leads>
    );

    return res.json(grouped);
  })
);

export default router;
