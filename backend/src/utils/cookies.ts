import { Response } from "express";

/**
 * Set JWT in HttpOnly cookie
 * Secure flag: true in production, false in development
 * SameSite: strict - CSRF protection
 * MaxAge: 7 days (604800000 ms)
 */
export const setJWTCookie = (res: Response, token: string): void => {
  const isProduction = process.env.NODE_ENV === "production";
  
  res.cookie("auth", token, {
    httpOnly: true, // Prevents JavaScript access (XSS protection)
    secure: isProduction, // HTTPS only in production
    sameSite: "strict", // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/",
  });
};

/**
 * Clear JWT cookie on logout
 */
export const clearJWTCookie = (res: Response): void => {
  res.clearCookie("auth", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
};
