import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1)
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid login payload",
      errors: parsed.error.flatten()
    });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const passwordMatches = await bcrypt.compare(parsed.data.password, user.password);
  if (!passwordMatches) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const token = signToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    return res.json({ user: req.user });
  })
);

export default router;
