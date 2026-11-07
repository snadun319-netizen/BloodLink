import rateLimit, { Options } from "express-rate-limit";
import { PostgresRateLimitStore } from "../services/rateLimit.store";

const limiter = (scope: string, options: Partial<Options>) => rateLimit({ ...options,
  ...(process.env.NODE_ENV === "production" || process.env.RATE_LIMIT_STORE === "postgres" ? { store: new PostgresRateLimitStore(scope) } : {}),
});

export const uploadLimiter = limiter("uploadLimiter", { windowMs: 60 * 60 * 1000, limit: 10,
  standardHeaders: true, legacyHeaders: false, message: { error: 'Document upload limit reached. Try again later.' } });

/**
 * Rate limiter configurations for auth endpoints.
 * Protects against brute-force attacks and abuse.
 */

/**
 * Login rate limiter:
 * - 10 attempts per 15 minutes per IP
 * - Prevents brute-force password attacks
 */
export const loginLimiter = limiter("loginLimiter", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error:
      "Too many login attempts. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,

});

/**
 * Registration rate limiter:
 * - 5 registration attempts per hour per IP
 * - Prevents mass account creation
 */
export const registerLimiter = limiter("registerLimiter", {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: {
    error: "Too many registration attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Forgot password rate limiter:
 * - 3 requests per 15 minutes per IP
 * - Prevents OTP spam / email bombing
 */
export const forgotPasswordLimiter = limiter("forgotPasswordLimiter", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3,
  message: {
    error:
      "Too many password reset requests. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * OTP verification rate limiter:
 * - 10 attempts per 15 minutes per IP
 * - Prevents OTP brute-forcing
 */
export const otpVerifyLimiter = limiter("otpVerifyLimiter", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: {
    error: "Too many OTP verification attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * OTP send rate limiter:
 * - 5 sends per 15 minutes per IP
 * - Prevents OTP flooding
 */
export const otpSendLimiter = limiter("otpSendLimiter", {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error: "Too many OTP requests. Please wait before requesting another.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter:
 * - 100 requests per 15 minutes per IP
 * - Single-process request throttling
 */
export const generalLimiter = limiter("generalLimiter", {
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests. Please slow down.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
