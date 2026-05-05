import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { prisma } from "../prisma.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { signToken } from "../utils/jwt.js";
import { setJWTCookie, clearJWTCookie } from "../utils/cookies.js";
import { AuditService, AuditAction } from "../services/auditService.js";
import { validateEmail, validatePassword } from "../middleware/security.js";
import { resolveTenantSlugFromRequest } from "../utils/tenantSlug.js";
import { env } from "../config.js";

const router = Router();

// Stricter validation schemas
const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  tenantId: z.number().int().optional(),
  tenantSlug: z.string().trim().regex(/^[a-z0-9-]+$/).optional()
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
        errors: process.env.NODE_ENV === 'development' ? parsed.error.flatten() : undefined
      });
    }

    const email = parsed.data.email.toLowerCase();
    const ipAddress = req.ip || req.connection.remoteAddress || 'UNKNOWN';
    const tenantSlug = parsed.data.tenantSlug ?? resolveTenantSlugFromRequest(req, env.ROOT_DOMAIN);
    
    // Find user
    const user = await prisma.user.findFirst({
      where: {
        email,
        ...(parsed.data.tenantId && { tenantId: parsed.data.tenantId }),
        ...(tenantSlug && { tenant: { slug: tenantSlug } })
      },
      include: { tenant: true }
    });

    if (!user) {
      // Log failed attempt
      await AuditService.logFailedAccess(
        0,
        parsed.data.tenantId || 0,
        'User',
        ipAddress,
        'Invalid email'
      );
      
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    const passwordMatches = await bcrypt.compare(parsed.data.password, user.password);
    if (!passwordMatches) {
      // Log failed attempt
      await AuditService.logFailedAccess(
        user.id,
        user.tenantId,
        'User',
        ipAddress,
        'Invalid password'
      );
      
      return res.status(401).json({ 
        success: false,
        message: "Invalid email or password" 
      });
    }

    if (tenantSlug && user.role !== "SUPER_ADMIN" && user.tenant.slug !== tenantSlug) {
      return res.status(403).json({
        success: false,
        message: "This account does not belong to this tenant portal"
      });
    }

    // Log successful login
    await AuditService.logLogin(user.id, user.tenantId, ipAddress, true);

    const token = signToken({
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role
    });

    // Set JWT in HttpOnly cookie
    setJWTCookie(res, token);

    return res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantName: user.tenant.name
      }
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const tenantSlug = resolveTenantSlugFromRequest(req, env.ROOT_DOMAIN);
    if (tenantSlug && req.user?.role !== "SUPER_ADMIN") {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.user!.tenantId },
        select: { slug: true }
      });
      if (!tenant || tenant.slug !== tenantSlug) {
        return res.status(403).json({
          success: false,
          message: "Session does not belong to this tenant portal"
        });
      }
    }
    return res.json({ user: req.user });
  })
);

router.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    // Clear JWT cookie
    clearJWTCookie(res);

    // Log logout
    const ipAddress = req.ip || req.connection.remoteAddress || 'UNKNOWN';
    if (req.user) {
      await AuditService.logLogin(req.user.id, req.user.tenantId, ipAddress, false);
    }

    return res.json({
      success: true,
      message: "Logged out successfully"
    });
  })
);

export default router;
