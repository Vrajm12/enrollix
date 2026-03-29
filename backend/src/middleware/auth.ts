import { Role } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication token missing" });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = verifyToken(token);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

export const requireRole =
  (roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    return next();
  };
