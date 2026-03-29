import { Role } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// Get today's follow-ups
router.get(
  "/followups/today",
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where =
      req.user?.role === Role.COUNSELOR
        ? {
            AND: [
              { nextFollowUp: { gte: today, lt: tomorrow } },
              { OR: [{ assignedTo: req.user.id }, { assignedTo: null }] }
            ]
          }
        : {
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

    const where =
      req.user?.role === Role.COUNSELOR
        ? {
            AND: [
              { nextFollowUp: { lt: today } },
              { OR: [{ assignedTo: req.user.id }, { assignedTo: null }] }
            ]
          }
        : {
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
    const where =
      req.user?.role === Role.COUNSELOR
        ? { OR: [{ assignedTo: req.user.id }, { assignedTo: null }] }
        : {};

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
