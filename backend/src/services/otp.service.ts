import crypto from "crypto";
import { PoolClient } from "pg";
import { pool } from "../db";
import { transaction, HttpError } from "../transaction";
import { hashPassword, verifyPassword, verifyUnknownPassword } from "./password.service";
import { hashToken, revokeAllUserTokens } from "./token.service";

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();
const newToken = () => crypto.randomBytes(32).toString("hex");

export async function createRegistrationOtp(identifier: string, type: "email" | "phone"): Promise<string> {
  const otp = generateOtp();
  const hash = await hashPassword(otp);
  await transaction(async client => {
    // Lock a stable identifier even when no challenge row exists yet.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [type + ":" + identifier]);
    const recent = await client.query("SELECT id FROM registration_otps WHERE identifier = $1 AND identifier_type = $2 AND created_at > NOW() - INTERVAL '45 seconds'", [identifier, type]);
    if (recent.rows.length) throw new HttpError(429, "Wait 45 seconds before requesting another code");
    await client.query("DELETE FROM registration_otps WHERE identifier = $1 AND identifier_type = $2", [identifier, type]);
    await client.query("INSERT INTO registration_otps (identifier, identifier_type, otp_hash, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '15 minutes')", [identifier, type, hash]);
  });
  return otp;
}
export async function verifyRegistrationOtp(identifier: string, type: "email" | "phone", otp: string): Promise<{ valid: boolean; registrationToken?: string; error?: string }> {
  return transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [type + ":" + identifier]);
    const record = (await client.query(
      "SELECT *, expires_at > NOW() AS unexpired FROM registration_otps WHERE identifier = $1 AND identifier_type = $2 ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [identifier, type]
    )).rows[0];
    if (!record || record.verified_at || !record.unexpired || record.attempts >= record.max_attempts) return { valid: false, error: "Invalid or expired verification code" };
    await client.query("UPDATE registration_otps SET attempts = attempts + 1 WHERE id = $1", [record.id]);
    if (!await verifyPassword(record.otp_hash, otp)) return { valid: false, error: "Invalid or expired verification code" };
    const token = newToken();
    await client.query("UPDATE registration_otps SET verified_at = NOW(), verification_token_hash = $1, expires_at = NOW() + INTERVAL '15 minutes' WHERE id = $2", [hashToken(token), record.id]);
    return { valid: true, registrationToken: token };
  });
}
export async function consumeRegistrationProof(email: string, token: string, client: PoolClient): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["email:" + email]);
  const result = await client.query(
    "DELETE FROM registration_otps WHERE identifier = $1 AND identifier_type = 'email' AND verification_token_hash = $2 AND verified_at IS NOT NULL AND expires_at > NOW() RETURNING id",
    [email, hashToken(token)]
  );
  if (!result.rows.length) throw new HttpError(400, "Verify your email before registering");
}
export async function createPasswordResetOtp(userId: number, client?: PoolClient): Promise<string> {
  if (!client) return transaction(tx => createPasswordResetOtp(userId, tx));
  const otp = generateOtp();
  const hash = await hashPassword(otp);
  await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [userId]);
  const recent = await client.query("SELECT id FROM password_reset_tokens WHERE user_id = $1 AND created_at > NOW() - INTERVAL '45 seconds'", [userId]);
  if (recent.rows.length) throw new HttpError(429, "Wait before requesting another code");
  await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL", [userId]);
  await client.query("INSERT INTO password_reset_tokens (user_id, otp_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '15 minutes')", [userId, hash]);
  return otp;
}
export async function verifyPasswordResetOtp(userId: number, otp: string): Promise<{ valid: boolean; resetToken?: string; error?: string }> {
  return transaction(async client => {
    const user = (await client.query("SELECT status FROM users WHERE id = $1 FOR UPDATE", [userId])).rows[0];
    if (!user || user.status !== "active") {
      await verifyUnknownPassword(otp);
      return { valid: false, error: "Invalid or expired reset code" };
    }
    const record = (await client.query(
      "SELECT *, expires_at > NOW() AS unexpired FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [userId]
    )).rows[0];
    if (!record || record.verified_at || !record.unexpired || record.attempts >= record.max_attempts) {
      await verifyUnknownPassword(otp);
      return { valid: false, error: "Invalid or expired reset code" };
    }
    await client.query("UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE id = $1", [record.id]);
    if (!await verifyPassword(record.otp_hash, otp)) return { valid: false, error: "Invalid or expired reset code" };
    const token = newToken();
    await client.query("UPDATE password_reset_tokens SET verified_at = NOW(), reset_token_hash = $1, expires_at = NOW() + INTERVAL '15 minutes' WHERE id = $2", [hashToken(token), record.id]);
    return { valid: true, resetToken: token };
  });
}
export async function completePasswordReset(token: string, password: string, email?: string): Promise<number | null> {
  // Hash before opening the transaction, then consume proof and update credentials atomically.
  const passwordHash = await hashPassword(password);
  return transaction(async client => {
    const reference = (await client.query("SELECT user_id FROM password_reset_tokens WHERE reset_token_hash = $1", [hashToken(token)])).rows[0];
    if (!reference) return null;
    const user = (await client.query("SELECT id, email, status FROM users WHERE id = $1 FOR UPDATE", [reference.user_id])).rows[0];
    if (!user || user.status !== "active" || (email && user.email.toLowerCase() !== email)) return null;
    const proof = await client.query(
      "UPDATE password_reset_tokens SET used_at = NOW() WHERE reset_token_hash = $1 AND user_id = $2 AND verified_at IS NOT NULL AND used_at IS NULL AND expires_at > NOW() RETURNING id",
      [hashToken(token), user.id]
    );
    if (!proof.rows.length) return null;
    await client.query("UPDATE users SET password_hash = $1, must_change_password = false, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $2", [passwordHash, user.id]);
    await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL", [user.id]);
    await client.query("UPDATE password_reset_email_jobs SET status = 'cancelled', lease_until = NULL WHERE user_id = $1", [user.id]);
    await revokeAllUserTokens(user.id, client);
    return user.id;
  });
}
export async function cleanupExpiredOtps(): Promise<void> {
  await pool.query("DELETE FROM registration_otps WHERE expires_at < NOW()");
  await pool.query("DELETE FROM password_reset_tokens WHERE expires_at < NOW()");
}
