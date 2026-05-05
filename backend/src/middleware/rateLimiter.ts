import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

declare global {
  var rateLimitStore: Map<string, { count: number; resetTime: number }>;
  var failedLoginStore: Map<string, { count: number; resetTime: number }>;
}

/**
 * Rate Limiting Configuration
 * Implements per-IP, per-endpoint rate limiting
 * with tracking and alerts for suspicious activity
 */

interface RateLimitConfig {
  windowMs: number; // Time window in ms
  max: number; // Max requests per window
  message: string;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

/**
 * Global rate limiter (all endpoints)
 * 100 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Don't rate limit health-check
    return req.path === '/health';
  }
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP (brute force protection)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts max
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Only limit POST to /login
    return req.method !== 'POST' || req.path !== '/login';
  }
});

/**
 * API endpoint rate limiter
 * 30 requests per minute per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many API requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Custom rate limit middleware that tracks failed attempts
 * for security alerts
 */
export const trackRateLimitByUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }

  const key = `rate-limit:user:${req.user.id}`;
  
  // In-memory tracking for demo (use Redis in production)
  if (!(global as any).rateLimitStore) {
    (global as any).rateLimitStore = {};
  }

  const store = (global as any).rateLimitStore;
  
  if (!store[key]) {
    store[key] = { count: 0, firstAttempt: Date.now(), failures: [] };
  }

  const tracking = store[key];
  
  // Reset if time window passed
  if (Date.now() - tracking.firstAttempt > 15 * 60 * 1000) {
    tracking.count = 0;
    tracking.failures = [];
    tracking.firstAttempt = Date.now();
  }

  // Detect suspicious patterns
  if (tracking.count > 3) {
    console.warn(`[SECURITY] Suspicious activity detected for user ${req.user.id}: ${tracking.count} attempts in 15 min`);
  }

  tracking.count++;
  
  next();
};

/**
 * Track failed login attempts for security alerts
 */
export const trackFailedLogin = (ip: string) => {
  if (!(global as any).failedLoginStore) {
    (global as any).failedLoginStore = {};
  }

  const store = (global as any).failedLoginStore;
  const key = `failed:${ip}`;

  if (!store[key]) {
    store[key] = { attempts: 0, firstAttempt: Date.now() };
  }

  const tracking = store[key];

  // Reset if 15 min passed
  if (Date.now() - tracking.firstAttempt > 15 * 60 * 1000) {
    tracking.attempts = 0;
    tracking.firstAttempt = Date.now();
  }

  tracking.attempts++;

  // Alert on brute force pattern (10+ attempts in 15 min)
  if (tracking.attempts > 10) {
    console.error(`[SECURITY ALERT] Brute force detected from IP ${ip}: ${tracking.attempts} failed attempts`);
  }

  return tracking.attempts;
};

/**
 * Get current rate limit info for a user
 */
export const getRateLimitInfo = (req: Request) => {
  return {
    limit: (req as any).rateLimit?.limit || 100,
    current: (req as any).rateLimit?.current || 0,
    remaining: (req as any).rateLimit?.remaining || 100,
    resetTime: (req as any).rateLimit?.resetTime || new Date(Date.now() + 15 * 60 * 1000)
  };
};
