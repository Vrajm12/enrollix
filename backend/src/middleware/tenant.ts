import { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma.js";
import { env } from "../config.js";
import { resolveTenantSlugFromRequest } from "../utils/tenantSlug.js";

/**
 * Tenant context middleware
 * Validates that the user has access to the requested resource's tenant
 * and sets the tenant context for the request
 */
export const tenantContext = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Check if user's tenant still exists and is active
  const tenant = await prisma.tenant.findFirst({
    where: {
      id: req.user.tenantId,
      isActive: true
    }
  });

  if (!tenant) {
    return res.status(403).json({ message: "Tenant not found or inactive" });
  }

  const tenantSlug = resolveTenantSlugFromRequest(req, env.ROOT_DOMAIN);
  if (tenantSlug && req.user.role !== "SUPER_ADMIN" && tenant.slug !== tenantSlug) {
    return res.status(403).json({ message: "Cross-tenant portal access denied" });
  }

  // Attach tenant to request for use in routes
  (req as any).tenant = tenant;
  return next();
};

/**
 * Ensure user belongs to the same tenant as a resource
 */
export const validateTenantResource = (
  req: Request,
  resourceTenantId: number
): boolean => {
  if (!req.user) {
    return false;
  }

  // Superadmins can access any tenant's resources
  if (req.user.role === "SUPER_ADMIN") {
    return true;
  }

  // Other users can only access their own tenant's resources
  return req.user.tenantId === resourceTenantId;
};
