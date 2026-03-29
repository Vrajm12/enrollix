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
  res.status(500).json({ message: "Internal server error" });
};
