import { Role } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/counselors",
  asyncHandler(async (_req, res) => {
    const counselors = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.ADMIN, Role.COUNSELOR]
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

export default router;
