import crypto from "crypto";
import { pool } from "../db";
import { hashPassword } from "./password.service";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 15;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure numeric OTP
 */
function generateOtp(): string {
  // Use crypto.randomInt for uniform distribution
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return crypto.randomInt(min, max + 1).toString();
}

/**
 * Hash an OTP for secure storage (we reuse argon2 from password service)
 */
async function hashOtp(otp: string): Promise<string> {
  return await hashPassword(otp);
}

// ─── Registration OTP ───────────────────────────────────────────────────────

/**
 * Create and store a registration OTP for phone/email verification.
 * Invalidates any previous unused OTPs for the same identifier.
 */
export async function createRegistrationOtp(
  identifier: string,
  identifierType: "email" | "phone"
): Promise<string> {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate all previous un-verified OTPs for this identifier
  await pool.query(
    `DELETE FROM registration_otps
     WHERE identifier = $1 AND identifier_type = $2 AND verified_at IS NULL`,
    [identifier, identifierType]
  );

  await pool.query(
    `INSERT INTO registration_otps (identifier, identifier_type, otp_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [identifier, identifierType, otpHash, expiresAt]
  );

  return otp;
}

/**
 * Verify a registration OTP. Returns true if valid.
 */
export async function verifyRegistrationOtp(
  identifier: string,
  identifierType: "email" | "phone",
  otp: string
): Promise<{ valid: boolean; error?: string }> {
  const result = await pool.query(
    `SELECT id, otp_hash, attempts, max_attempts, expires_at, verified_at
     FROM registration_otps
     WHERE identifier = $1 AND identifier_type = $2 AND verified_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [identifier, identifierType]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: "No OTP found. Please request a new one." };
  }

  const record = result.rows[0];

  // Check if already verified
  if (record.verified_at) {
    return { valid: false, error: "OTP already used." };
  }

  // Check expiry
  if (new Date(record.expires_at) < new Date()) {
    return { valid: false, error: "OTP has expired. Please request a new one." };
  }

  // Check max attempts
  if (record.attempts >= record.max_attempts) {
    return {
      valid: false,
      error: "Too many incorrect attempts. Please request a new OTP.",
    };
  }

  // Increment attempt count
  await pool.query(
    `UPDATE registration_otps SET attempts = attempts + 1 WHERE id = $1`,
    [record.id]
  );

  // Verify OTP using argon2
  const { verifyPassword } = await import("./password.service");
  const isValid = await verifyPassword(record.otp_hash, otp);

  if (!isValid) {
    return { valid: false, error: "Invalid OTP. Please try again." };
  }

  // Mark as verified
  await pool.query(
    `UPDATE registration_otps SET verified_at = NOW() WHERE id = $1`,
    [record.id]
  );

  return { valid: true };
}

// ─── Password Reset OTP ─────────────────────────────────────────────────────

/**
 * Create a password reset OTP for a user.
 * Invalidates any previous unused reset tokens.
 */
export async function createPasswordResetOtp(userId: number): Promise<string> {
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate previous unused tokens for this user
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW()
     WHERE user_id = $1 AND used_at IS NULL`,
    [userId]
  );

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, otp_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, otpHash, expiresAt]
  );

  return otp;
}

/**
 * Verify a password reset OTP. Returns a temporary reset token ID if valid.
 */
export async function verifyPasswordResetOtp(
  userId: number,
  otp: string
): Promise<{ valid: boolean; tokenId?: number; error?: string }> {
  const result = await pool.query(
    `SELECT id, otp_hash, attempts, max_attempts, expires_at, used_at
     FROM password_reset_tokens
     WHERE user_id = $1 AND used_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: "No reset request found. Please start over." };
  }

  const record = result.rows[0];

  // Check expiry
  if (new Date(record.expires_at) < new Date()) {
    return { valid: false, error: "OTP has expired. Please request a new one." };
  }

  // Check max attempts
  if (record.attempts >= record.max_attempts) {
    return {
      valid: false,
      error: "Too many incorrect attempts. Please request a new OTP.",
    };
  }

  // Increment attempt count
  await pool.query(
    `UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = $1`,
    [record.id]
  );

  // Verify OTP
  const { verifyPassword } = await import("./password.service");
  const isValid = await verifyPassword(record.otp_hash, otp);

  if (!isValid) {
    return { valid: false, error: "Invalid OTP. Please try again." };
  }

  return { valid: true, tokenId: record.id };
}

/**
 * Mark a password reset token as used (after successful password change).
 */
export async function markResetTokenUsed(tokenId: number): Promise<void> {
  await pool.query(
    `UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`,
    [tokenId]
  );
}

/**
 * Check if a reset token is still valid (not used, not expired).
 */
export async function isResetTokenValid(
  tokenId: number,
  userId: number
): Promise<boolean> {
  const result = await pool.query(
    `SELECT id FROM password_reset_tokens
     WHERE id = $1 AND user_id = $2 AND used_at IS NULL AND expires_at > NOW()`,
    [tokenId, userId]
  );
  return result.rows.length > 0;
}

/**
 * Cleanup expired OTPs (can be called periodically)
 */
export async function cleanupExpiredOtps(): Promise<void> {
  await pool.query(
    `DELETE FROM registration_otps WHERE expires_at < NOW() AND verified_at IS NULL`
  );
  await pool.query(
    `DELETE FROM password_reset_tokens WHERE expires_at < NOW() AND used_at IS NULL`
  );
}
