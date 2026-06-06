import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";
import { AuditService } from "../services/auditService.js";
import { prisma } from "../prisma.js";

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Try to get token from Authorization header first (backwards compatibility)
  let token = null;
  const authHeader = req.headers.authorization;
  
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  
  // Fall back to cookie
  if (!token && req.cookies?.auth) {
    token = req.cookies.auth;
  }
  
  if (!token) {
    const ipAddress = req.ip || req.connection.remoteAddress || 'UNKNOWN';
    AuditService.logFailedAccess(0, 0, 'Auth', ipAddress, 'Missing auth header');
    return res.status(401).json({ 
      success: false,
      message: "Authentication token missing" 
    });
  }

  try {
    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists"
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    const ipAddress = req.ip || req.connection.remoteAddress || 'UNKNOWN';
    AuditService.logFailedAccess(0, 0, 'Auth', ipAddress, 'Invalid token');
    return res.status(401).json({ 
      success: false,
      message: "Invalid or expired token" 
    });
  }
};

export const requireRole =
  (roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: "Unauthorized" 
      });
    }

    if (!roles.includes(req.user.role)) {
      const ipAddress = req.ip || req.connection.remoteAddress || 'UNKNOWN';
      AuditService.logFailedAccess(
        req.user.id,
        req.user.tenantId,
        `${req.method} ${req.path}`,
        ipAddress,
        `Insufficient permissions for role ${req.user.role}`
      );
      return res.status(403).json({ 
        success: false,
        message: "Insufficient permissions" 
      });
    }

    return next();
  };
