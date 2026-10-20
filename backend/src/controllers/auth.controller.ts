import { Request, Response } from "express";
import { pool } from "../db";
import { transaction, HttpError } from "../transaction";
import { hashPassword, verifyPassword, verifyUnknownPassword } from "../services/password.service";
import { issueTokenPair, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from "../services/token.service";
import { createRegistrationOtp, verifyRegistrationOtp, consumeRegistrationProof, verifyPasswordResetOtp, completePasswordReset } from "../services/otp.service";
import { sendRegistrationOtpEmail, assertEmailConfigured } from "../services/email.service";
import { enqueuePasswordReset } from "../services/passwordResetDelivery.service";
import { logAudit } from "../services/audit.service";
import { AuthRequest } from "../middleware/auth.middleware";

const MAX_FAILED_ATTEMPTS = 5;

export async function register(req: Request, res: Response) {
  const { email, password, fullName, phone, nic, bloodGroup, dob, documentUrl, registrationToken } = req.body;
  const passwordHash = await hashPassword(password);
  const result = await transaction(async client => {
    const duplicate = await client.query("SELECT id FROM users WHERE LOWER(email) = $1", [email]);
    if (duplicate.rows.length) throw new HttpError(409, "Email already registered");
    await consumeRegistrationProof(email, registrationToken, client);
    const user = (await client.query(
      "INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, 'donor', 'active') RETURNING id, email, role, status",
      [email, passwordHash]
    )).rows[0];
    await client.query(
      "INSERT INTO donor_profiles (user_id, full_name, nic, phone, date_of_birth, blood_group) VALUES ($1, $2, $3, $4, $5, $6)",
      [user.id, fullName, nic, phone, dob || null, bloodGroup]
    );
    // A medical verification request must reference a supplied document, not a fabricated file.
    if (documentUrl) await client.query(
      "INSERT INTO donor_verifications (donor_id, document_url, claimed_blood_group, status) VALUES ($1, $2, $3, 'pending')",
      [user.id, documentUrl, bloodGroup]
    );
    const tokens = await issueTokenPair({ id: String(user.id), role: user.role, orgId: null }, undefined, client);
    return { user, tokens };
  });
  await logAudit({ actorUserId: String(result.user.id), action: "DONOR_REGISTRATION", targetType: "user", targetId: String(result.user.id), ipAddress: req.ip });
  return res.status(201).json({
    message: documentUrl ? "Registration successful. Blood group verification is pending." : "Registration successful. Submit a blood group document for verification.",
    accessToken: result.tokens.accessToken, refreshToken: result.tokens.refreshToken,
    user: { ...result.user, fullName, bloodGroup, phone },
  });
}

export async function login(req: Request, res: Response) {
  const { email, phone, password } = req.body;
  const outcome = await transaction(async client => {
    const result = await client.query(
      email
        ? "SELECT u.* FROM users u WHERE LOWER(u.email) = $1 FOR UPDATE OF u"
        : "SELECT u.* FROM users u JOIN donor_profiles dp ON dp.user_id = u.id WHERE dp.phone = $1 FOR UPDATE OF u",
      [email || phone]
    );
    const user = result.rows[0];
    if (!user) { await verifyUnknownPassword(password); return { status: 401, error: "Invalid credentials" }; }
    if (user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      if (!await verifyPassword(user.password_hash, password)) return { status: 401, error: "Invalid credentials" };
      return { status: 423, error: "Account temporarily locked. Try again later." };
    }
    if (!await verifyPassword(user.password_hash, password)) {
      // Expired lockouts start a new attempt window.
      const attempts = (user.locked_until ? 0 : user.failed_login_attempts) + 1;
      await client.query(
        "UPDATE users SET failed_login_attempts = $1::integer, locked_until = CASE WHEN $1::integer >= $2::integer THEN NOW() + INTERVAL '30 minutes' ELSE NULL END, updated_at = NOW() WHERE id = $3",
        [attempts, MAX_FAILED_ATTEMPTS, user.id]
      );
      return { status: 401, error: "Invalid credentials" };
    }
    if (user.status !== "active") return { status: 403, error: "Account is pending verification or suspended" };
    if (["hospital_staff", "bloodbank_staff"].includes(user.role)) {
      const org = (await client.query("SELECT verification_status, type, is_active FROM organizations WHERE id = $1", [user.organization_id])).rows[0];
      if (!org || !org.is_active || org.verification_status !== "approved" || (user.role === "hospital_staff" ? org.type !== "hospital" : org.type !== "bloodbank")) {
        return { status: 403, error: "Organization is not approved for this staff account" };
      }
    }
    await client.query("UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $1", [user.id]);
    const tokens = await issueTokenPair({ id: String(user.id), role: user.role, orgId: user.organization_id ? String(user.organization_id) : null }, undefined, client);
    const profile = user.role === "donor" ? (await client.query("SELECT full_name, blood_group, phone FROM donor_profiles WHERE user_id = $1", [user.id])).rows[0] : null;
    return { status: 200, tokens, user: {
      id: user.id, email: user.email, role: user.role, organizationId: user.organization_id, status: user.status,
      mustChangePassword: user.must_change_password,
      ...(profile && { fullName: profile.full_name, bloodGroup: profile.blood_group, phone: profile.phone }),
    } };
  });
  if (!outcome.tokens || !outcome.user) return res.status(outcome.status).json({ error: outcome.error });
  await logAudit({ actorUserId: String(outcome.user.id), action: "USER_LOGIN", targetType: "user", targetId: String(outcome.user.id), ipAddress: req.ip });
  return res.json({ accessToken: outcome.tokens.accessToken, refreshToken: outcome.tokens.refreshToken, user: outcome.user });
}

export async function getMe(req: AuthRequest, res: Response) {
  const user = (await pool.query("SELECT id, email, role, organization_id, status, created_at, must_change_password FROM users WHERE id = $1", [req.user!.id])).rows[0];
  if (!user) return res.status(401).json({ error: "Session expired" });
  const profile = user.role === "donor" ? (await pool.query(
    "SELECT full_name, blood_group, phone, nic, date_of_birth, is_available, last_donation_date, next_eligible_date FROM donor_profiles WHERE user_id = $1", [user.id]
  )).rows[0] : null;
  const verification = user.role === "donor" ? (await pool.query("SELECT status FROM donor_verifications WHERE donor_id = $1 ORDER BY id DESC LIMIT 1", [user.id])).rows[0] : null;
  return res.json({ user: {
    id: user.id, email: user.email, role: user.role, organizationId: user.organization_id, status: user.status, createdAt: user.created_at,
    mustChangePassword: user.must_change_password,
    ...(profile && { fullName: profile.full_name, bloodGroup: profile.blood_group, phone: profile.phone, nic: profile.nic,
      dateOfBirth: profile.date_of_birth, isAvailable: profile.is_available, lastDonationDate: profile.last_donation_date, nextEligibleDate: profile.next_eligible_date }),
    verificationStatus: verification?.status || "not_submitted",
  } });
}

export async function refresh(req: Request, res: Response) {
  const result = await rotateRefreshToken(req.body.refreshToken);
  if (!result) return res.status(401).json({ error: "Invalid or expired refresh token" });
  return res.json({ accessToken: result.accessToken, refreshToken: result.refreshToken, user: {
    id: Number(result.user.id), role: result.user.role, organizationId: result.user.orgId ? Number(result.user.orgId) : null,
  } });
}
export async function logout(req: Request, res: Response) {
  await revokeRefreshToken(req.body.refreshToken);
  return res.json({ message: "Logged out successfully" });
}
export async function sendOtp(req: Request, res: Response) {
  const { identifier, type } = req.body;
  // Registration verifies the recovery email. No SMS provider is currently configured.
  if (type !== "email") throw new HttpError(400, "Use email verification to create your account");
  assertEmailConfigured();
  if ((await pool.query("SELECT id FROM users WHERE LOWER(email) = $1", [identifier])).rows.length) throw new HttpError(409, "Email already registered");
  const otp = await createRegistrationOtp(identifier, type);
  try { await sendRegistrationOtpEmail(identifier, otp); } catch (error) {
    await pool.query("DELETE FROM registration_otps WHERE identifier = $1 AND identifier_type = 'email' AND verified_at IS NULL", [identifier]);
    throw error;
  }
  return res.json({ message: "Verification code sent to your email" });
}
export async function verifyOtp(req: Request, res: Response) {
  const { identifier, type, otp } = req.body;
  if (type !== "email") throw new HttpError(400, "Use email verification to create your account");
  const result = await verifyRegistrationOtp(identifier, type, otp);
  if (!result.valid) return res.status(400).json({ error: result.error });
  return res.json({ message: "Verification successful", verified: true, registrationToken: result.registrationToken });
}
export async function forgotPassword(req: Request, res: Response) {
  assertEmailConfigured();
  const message = "If this email is registered, a reset code has been sent.";
  await enqueuePasswordReset(req.body.email);
  return res.json({ message });
}
export async function verifyResetOtp(req: Request, res: Response) {
  const user = (await pool.query("SELECT id FROM users WHERE LOWER(email) = $1", [req.body.email])).rows[0];
  if (!user) await verifyUnknownPassword(req.body.otp);
  const result = user ? await verifyPasswordResetOtp(user.id, req.body.otp) : { valid: false };
  if (!result.valid) return res.status(400).json({ error: "Invalid or expired reset code" });
  return res.json({ message: "OTP verified. You can now reset your password.", resetToken: result.resetToken });
}
export async function resetPassword(req: Request, res: Response) {
  const userId = await completePasswordReset(req.body.resetToken, req.body.password, req.body.email);
  if (!userId) return res.status(400).json({ error: "Reset session has expired or is invalid. Please start over." });
  await logAudit({ actorUserId: String(userId), action: "PASSWORD_RESET_COMPLETED", targetType: "user", targetId: String(userId), ipAddress: req.ip });
  return res.json({ message: "Password reset successful. Please sign in with your new password." });
}

export async function changePassword(req: AuthRequest, res: Response) {
  const passwordHash = await hashPassword(req.body.password);
  await transaction(async client => {
    const user = (await client.query("SELECT password_hash FROM users WHERE id = $1 FOR UPDATE", [req.user!.id])).rows[0];
    if (!user || !await verifyPassword(user.password_hash, req.body.currentPassword)) throw new HttpError(400, "Current password is incorrect");
    await client.query("UPDATE users SET password_hash = $1, must_change_password = false, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = $2", [passwordHash, req.user!.id]);
    await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL", [req.user!.id]);
    await client.query("UPDATE password_reset_email_jobs SET status = 'cancelled', lease_until = NULL WHERE user_id = $1", [req.user!.id]);
    await revokeAllUserTokens(Number(req.user!.id), client);
  });
  return res.json({ message: "Password changed. Please sign in with your new password." });
}
