import { Router } from "express";
import {
  register,
  login,
  getMe,
  refresh,
  logout,
  sendOtp,
  verifyOtp,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  validateLoginInput,
  validateRegistrationInput,
  validateForgotPasswordInput,
  validateOtpInput,
  validateResetPasswordInput,
  validateSendOtpInput,
} from "../middleware/validation.middleware";
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  otpVerifyLimiter,
  otpSendLimiter,
} from "../middleware/rateLimiter.middleware";

const router = Router();

// ─── Registration ───────────────────────────────────────────────────────────
router.post("/register", registerLimiter, validateRegistrationInput, register);

// ─── Login ──────────────────────────────────────────────────────────────────
router.post("/login", loginLimiter, validateLoginInput, login);

// ─── Token Management ───────────────────────────────────────────────────────
router.post("/refresh", refresh);
router.post("/logout", logout);

// ─── Authenticated Profile ──────────────────────────────────────────────────
router.get("/me", authenticate, getMe);

// ─── Registration OTP ───────────────────────────────────────────────────────
router.post("/send-otp", otpSendLimiter, validateSendOtpInput, sendOtp);
router.post("/verify-otp", otpVerifyLimiter, validateOtpInput, verifyOtp);

// ─── Forgot Password Flow ───────────────────────────────────────────────────
router.post("/forgot-password", forgotPasswordLimiter, validateForgotPasswordInput, forgotPassword);
router.post("/verify-reset-otp", otpVerifyLimiter, validateOtpInput, verifyResetOtp);
router.post("/reset-password", validateResetPasswordInput, resetPassword);

export default router;
