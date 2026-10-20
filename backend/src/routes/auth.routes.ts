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
  changePassword,
} from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import {
  validateLoginInput,
  validateRegistrationInput,
  validateForgotPasswordInput,
  validateOtpInput,
  validateResetPasswordInput,
  validateSendOtpInput,
  validateTokenInput,
  validateChangePassword,
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
router.post("/change-password", loginLimiter, authenticate, validateChangePassword, changePassword);

// ─── Token Management ───────────────────────────────────────────────────────
router.post("/refresh", validateTokenInput, refresh);
router.post("/logout", validateTokenInput, logout);

// ─── Authenticated Profile ──────────────────────────────────────────────────
router.get("/me", authenticate, getMe);

// ─── Registration OTP ───────────────────────────────────────────────────────
router.post("/send-otp", otpSendLimiter, validateSendOtpInput, sendOtp);
router.post("/verify-otp", otpVerifyLimiter, validateOtpInput, verifyOtp);

// ─── Forgot Password Flow ───────────────────────────────────────────────────
router.post("/forgot-password", forgotPasswordLimiter, validateForgotPasswordInput, forgotPassword);
router.post("/verify-reset-otp", otpVerifyLimiter, validateOtpInput, verifyResetOtp);
router.post("/reset-password", otpVerifyLimiter, validateResetPasswordInput, resetPassword);

export default router;
