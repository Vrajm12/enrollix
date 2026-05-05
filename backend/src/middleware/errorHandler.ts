import { Request, Response, NextFunction } from 'express';

/**
 * Production-Grade Error Handler
 * Never leaks sensitive information
 * Logs errors securely
 * Returns sanitized response
 */

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ApiError extends Error implements AppError {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: AppError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const timestamp = new Date().toISOString();
  const path = req.originalUrl;
  const method = req.method;

  // Log full error internally (with stack trace)
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[ERROR] ${timestamp} ${method} ${path}`);
    console.error(error);
  } else {
    // In production, log to secure logging service
    console.error(`[ERROR] ${timestamp} - ${(error as any).message}`);
  }

  let statusCode = 500;
  let message = 'Internal Server Error';

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
  } else if (error instanceof SyntaxError && 'body' in error) {
    // JSON parsing error
    statusCode = 400;
    message = 'Invalid request format';
  } else if (error instanceof Error) {
    // Don't expose internal error details in production
    message = process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message;
  }

  // Never expose stack trace or internal details to client
  const response: any = {
    success: false,
    message,
    timestamp
  };

  // Only include error details in development
  if (process.env.NODE_ENV === 'development') {
    response.error = {
      statusCode,
      stack: (error as Error).stack
    };
  }

  res.status(statusCode).json(response);
};

// 404 handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

// Async error wrapper to avoid try-catch everywhere
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
