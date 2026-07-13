import { NextFunction, Request, Response } from "express";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // eslint-disable-next-line no-console
  console.error(error);
  const payloadError = error as { type?: string };
  if (payloadError?.type === "entity.too.large") {
    return res.status(413).json({
      message: "Uploaded payload is too large. Maximum allowed size is 50 MB."
    });
  }
  if (payloadError?.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Invalid JSON payload."
    });
  }
  res.status(500).json({ message: "Internal server error" });
};
