import { NextFunction, Request, Response } from "express";
import { prisma } from "../prisma.js";
import { isMissingApiRequestLogTableError } from "../utils/prismaErrors.js";

const MAX_ERROR_LENGTH = 500;
let requestLogTableAvailable = true;

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  let errorMessage: string | null = null;

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (
      res.statusCode >= 400 &&
      body &&
      typeof body === "object" &&
      "message" in body &&
      typeof (body as Record<string, unknown>).message === "string"
    ) {
      errorMessage = ((body as Record<string, string>).message ?? "").slice(0, MAX_ERROR_LENGTH);
    }
    return originalJson(body);
  }) as Response["json"];

  res.on("finish", () => {
    if (!requestLogTableAvailable) {
      return;
    }

    const ignoredPaths = ["/health", "/api/info"];
    if (ignoredPaths.includes(req.path)) {
      return;
    }

    const durationMs = Date.now() - start;
    const contentLength = req.headers["content-length"];
    const requestSize = contentLength ? parseInt(contentLength, 10) : null;
    const responseSizeHeader = res.getHeader("content-length");
    const responseSize =
      typeof responseSizeHeader === "string"
        ? parseInt(responseSizeHeader, 10)
        : typeof responseSizeHeader === "number"
          ? responseSizeHeader
          : null;

    void prisma.apiRequestLog
      .create({
        data: {
          tenantId: req.user?.tenantId ?? null,
          userId: req.user?.id ?? null,
          method: req.method,
          path: req.originalUrl.split("?")[0] ?? req.path,
          statusCode: res.statusCode,
          durationMs,
          requestSize: Number.isNaN(requestSize) ? null : requestSize,
          responseSize: Number.isNaN(responseSize) ? null : responseSize,
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] ?? null,
          errorMessage
        }
      })
      .catch((error: unknown) => {
        if (isMissingApiRequestLogTableError(error)) {
          requestLogTableAvailable = false;
          return;
        }
        // Avoid impacting request flow if logging fails.
      });
  });

  next();
};
