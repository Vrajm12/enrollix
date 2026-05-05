import { Request } from "express";

/**
 * Helper to get tenant filter for Prisma queries
 * Ensures user can only access their own tenant's data
 * except for SUPER_ADMIN who can access all
 */
export const getTenantFilter = (req: Request) => {
  if (!req.user) {
    throw new Error("User not authenticated");
  }

  // SUPER_ADMIN can access any tenant's data
  if (req.user.role === "SUPER_ADMIN") {
    return {}; // No filter
  }

  // All other users can only access their own tenant
  return { tenantId: req.user.tenantId };
};

/**
 * Helper to validate resource belongs to user's tenant
 */
export const validateResourceTenant = (
  userTenantId: number,
  resourceTenantId: number,
  userRole?: string
): boolean => {
  // SUPER_ADMIN can access any tenant's resources
  if (userRole === "SUPER_ADMIN") {
    return true;
  }

  // All other users can only access their own tenant's resources
  return userTenantId === resourceTenantId;
};

/**
 * Helper to validate a user belongs to a tenant
 */
export const validateUserTenant = (
  userTenantId: number,
  targetTenantId: number,
  userRole?: string
): boolean => {
  if (userRole === "SUPER_ADMIN") {
    return true;
  }

  return userTenantId === targetTenantId;
};
