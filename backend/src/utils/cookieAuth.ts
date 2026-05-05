import { Response } from 'express';

/**
 * Secure JWT Cookie Configuration
 * HttpOnly cookies prevent XSS token theft
 */

export interface JWTCookieOptions {
  httpOnly: boolean;
  secure: boolean; // HTTPS only in production
  sameSite: 'strict' | 'lax' | 'none';
  maxAge: number; // milliseconds
  path: string;
  domain?: string;
}

/**
 * Get secure cookie options based on environment
 */
export const getSecureCookieOptions = (): JWTCookieOptions => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true, // JavaScript cannot access this cookie
    secure: isProduction, // HTTPS only in production
    sameSite: 'strict', // Prevent CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/'
  };
};

/**
 * Set JWT in secure HttpOnly cookie
 * DO NOT use localStorage for sensitive tokens
 */
export const setJWTCookie = (res: Response, token: string): void => {
  const options = getSecureCookieOptions();

  res.cookie('jwt', token, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite as 'strict' | 'lax' | 'none',
    maxAge: options.maxAge,
    path: options.path
  });

  console.log('[AUTH] JWT set in HttpOnly cookie');
};

/**
 * Clear JWT cookie
 */
export const clearJWTCookie = (res: Response): void => {
  res.clearCookie('jwt', { path: '/' });
  console.log('[AUTH] JWT cookie cleared');
};

/**
 * Extract JWT from cookie
 * This runs automatically via middleware
 */
export const extractJWTFromCookie = (cookies: any): string | null => {
  if (!cookies || !cookies.jwt) {
    return null;
  }

  return cookies.jwt;
};

/**
 * CSRF Token Configuration
 * Used for state-changing requests (POST, PUT, DELETE)
 */

export const getCSRFTokenOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: false, // JavaScript MUST access this for form submissions
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: '/'
  };
};

/**
 * Set CSRF token in non-httpOnly cookie
 * Frontend will include this in X-CSRF-Token header
 */
export const setCSRFTokenCookie = (res: Response, token: string): void => {
  const options = getCSRFTokenOptions();

  res.cookie('_csrf', token, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite as 'strict' | 'lax' | 'none',
    maxAge: options.maxAge,
    path: options.path
  });

  console.log('[AUTH] CSRF token set');
};

/**
 * Migration guide: JavaScript code changes
 * 
 * BEFORE (localStorage - VULNERABLE):
 * ```typescript
 * localStorage.setItem('token', jwtToken);
 * const token = localStorage.getItem('token');
 * ```
 * 
 * AFTER (HttpOnly cookies - SECURE):
 * ```typescript
 * // Backend sends JWT in HttpOnly cookie automatically
 * // Frontend doesn't need to store it
 * 
 * // For API calls, browser includes cookie automatically
 * fetch('/api/leads', {
 *   credentials: 'include', // Include cookies
 *   headers: {
 *     'X-CSRF-Token': document.cookie.split('; ').find(row => row.startsWith('_csrf')).split('=')[1]
 *   }
 * });
 * ```
 */
