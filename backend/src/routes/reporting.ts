import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { LeadStatus } from "@prisma/client";

const router = Router();

// Schemas
const dateRangeSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Conversion Funnel Report
router.get(
  "/funnel",
  asyncHandler(async (req, res) => {
    const parsed = dateRangeSchema.safeParse({
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const where = {
      createdAt: {
        ...(parsed.data.startDate && { gte: new Date(parsed.data.startDate) }),
        ...(parsed.data.endDate && { lte: new Date(parsed.data.endDate) })
      }
    };

    const statuses = Object.values(LeadStatus);
    const funnel = await Promise.all(
      statuses.map(async (status) => ({
        stage: status,
        count: await prisma.lead.count({
          where: { ...where, status }
        })
      }))
    );

    // Calculate conversion rates
    const funnelWithRates = funnel.map((item, index) => ({
      ...item,
      rate: index === 0 ? 100 : (item.count / (funnel[0].count || 1)) * 100
    }));

    return res.json({
      reportType: "CONVERSION_FUNNEL",
      generatedAt: new Date(),
      data: funnelWithRates,
      total: funnel.reduce((sum, item) => sum + item.count, 0)
    });
  })
);

// Revenue & Performance Report
router.get(
  "/revenue",
  asyncHandler(async (req, res) => {
    const parsed = dateRangeSchema.safeParse({
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const where = {
      createdAt: {
        ...(parsed.data.startDate && { gte: new Date(parsed.data.startDate) }),
        ...(parsed.data.endDate && { lte: new Date(parsed.data.endDate) })
      }
    };

    const enrolled = await prisma.lead.count({
      where: { ...where, status: LeadStatus.ENROLLED }
    });

    const qualified = await prisma.lead.count({
      where: { ...where, status: LeadStatus.QUALIFIED }
    });

    const interested = await prisma.lead.count({
      where: { ...where, status: LeadStatus.INTERESTED }
    });

    const total = await prisma.lead.count({ where });

    // Mock revenue calculation (adjust based on your business logic)
    const estimatedRevenue = enrolled * 50000; // Assuming 50k per enrollment
    const qualifiedValue = qualified * 30000;
    const interestedValue = interested * 15000;

    return res.json({
      reportType: "REVENUE_PERFORMANCE",
      generatedAt: new Date(),
      data: {
        totalLeads: total,
        enrolled: {
          count: enrolled,
          estimatedRevenue
        },
        qualified: {
          count: qualified,
          estimatedValue: qualifiedValue
        },
        interested: {
          count: interested,
          estimatedValue: interestedValue
        },
        totalOpportunity: estimatedRevenue + qualifiedValue + interestedValue,
        conversionToEnrolled: total > 0 ? (enrolled / total) * 100 : 0,
        conversionToQualified: total > 0 ? (qualified / total) * 100 : 0
      }
    });
  })
);

// Team Performance Report
router.get(
  "/team-performance",
  asyncHandler(async (req, res) => {
    const parsed = dateRangeSchema.safeParse({
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const where = {
      createdAt: {
        ...(parsed.data.startDate && { gte: new Date(parsed.data.startDate) }),
        ...(parsed.data.endDate && { lte: new Date(parsed.data.endDate) })
      }
    };

    const counselors = await prisma.user.findMany({
      include: {
        leadsAssigned: {
          where
        },
        whatsappMessages: {
          where
        },
        smsMessages: {
          where
        }
      }
    });

    const teamPerformance = counselors.map((counselor) => {
      const leads = counselor.leadsAssigned;
      const enrolled = leads.filter((l) => l.status === LeadStatus.ENROLLED).length;
      const qualified = leads.filter((l) => l.status === LeadStatus.QUALIFIED).length;
      const hotLeads = leads.filter((l) => l.priority === "HOT").length;

      return {
        id: counselor.id,
        name: counselor.name,
        email: counselor.email,
        leadsManaged: leads.length,
        enrolled,
        qualified,
        hotLeads,
        conversionRate: leads.length > 0 ? (enrolled / leads.length) * 100 : 0,
        engagementScore: counselor.whatsappMessages.length + counselor.smsMessages.length,
        messages: {
          whatsapp: counselor.whatsappMessages.length,
          sms: counselor.smsMessages.length
        }
      };
    });

    const sorted = teamPerformance.sort((a, b) => b.enrolled - a.enrolled);

    return res.json({
      reportType: "TEAM_PERFORMANCE",
      generatedAt: new Date(),
      data: sorted
    });
  })
);

// Lead Source Analysis
router.get(
  "/lead-sources",
  asyncHandler(async (req, res) => {
    const parsed = dateRangeSchema.safeParse({
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const where = {
      createdAt: {
        ...(parsed.data.startDate && { gte: new Date(parsed.data.startDate) }),
        ...(parsed.data.endDate && { lte: new Date(parsed.data.endDate) })
      }
    };

    const leads = await prisma.lead.findMany({
      where,
      select: { source: true, status: true, priority: true }
    });

    const sourceAnalysis: Record<string, any> = {};

    leads.forEach((lead) => {
      const source = lead.source || "Unknown";
      if (!sourceAnalysis[source]) {
        sourceAnalysis[source] = {
          total: 0,
          enrolled: 0,
          qualified: 0,
          interested: 0,
          hot: 0,
          warm: 0,
          cold: 0
        };
      }

      sourceAnalysis[source].total++;

      if (lead.status === LeadStatus.ENROLLED) {
        sourceAnalysis[source].enrolled++;
      } else if (lead.status === LeadStatus.QUALIFIED) {
        sourceAnalysis[source].qualified++;
      } else if (lead.status === LeadStatus.INTERESTED) {
        sourceAnalysis[source].interested++;
      }

      if (lead.priority === "HOT") sourceAnalysis[source].hot++;
      else if (lead.priority === "WARM") sourceAnalysis[source].warm++;
      else if (lead.priority === "COLD") sourceAnalysis[source].cold++;
    });

    const data = Object.entries(sourceAnalysis).map(([source, stats]) => ({
      source,
      ...stats,
      roi: stats.enrolled / stats.total > 0 ? (stats.enrolled / stats.total) * 100 : 0
    }));

    return res.json({
      reportType: "LEAD_SOURCE_ANALYSIS",
      generatedAt: new Date(),
      data: data.sort((a, b) => b.enrolled - a.enrolled)
    });
  })
);

// Priority Distribution Report
router.get(
  "/priority-distribution",
  asyncHandler(async (req, res) => {
    const parsed = dateRangeSchema.safeParse({
      startDate: req.query.startDate,
      endDate: req.query.endDate
    });

    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten() });
    }

    const where = {
      createdAt: {
        ...(parsed.data.startDate && { gte: new Date(parsed.data.startDate) }),
        ...(parsed.data.endDate && { lte: new Date(parsed.data.endDate) })
      }
    };

    const priorities = ["COLD", "WARM", "HOT"] as const;
    const distribution = await Promise.all(
      priorities.map(async (priority) => ({
        priority,
        count: await prisma.lead.count({
          where: { ...where, priority }
        }),
        enrolled: await prisma.lead.count({
          where: { ...where, priority, status: LeadStatus.ENROLLED }
        })
      }))
    );

    return res.json({
      reportType: "PRIORITY_DISTRIBUTION",
      generatedAt: new Date(),
      data: distribution
    });
  })
);

// Export Report
router.post(
  "/save",
  asyncHandler(async (req, res) => {
    const { reportType, data, filters } = req.body;

    if (!reportType || !data) {
      return res.status(400).json({
        message: "reportType and data are required"
      });
    }

    const report = await prisma.report.create({
      data: {
        name: `${reportType} - ${new Date().toLocaleDateString()}`,
        reportType,
        generatedBy: req.user!.id,
        data,
        filters: filters || {}
      }
    });

    return res.status(201).json(report);
  })
);

// List Saved Reports
router.get(
  "/saved",
  asyncHandler(async (req, res) => {
    const reports = await prisma.report.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return res.json(reports);
  })
);

// Get Specific Report
router.get(
  "/saved/:id",
  asyncHandler(async (req, res) => {
    const report = await prisma.report.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    return res.json(report);
  })
);

export default router;
