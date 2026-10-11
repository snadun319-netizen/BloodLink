import { Request, Response } from "express";
import { pool } from "../db";
import { hashPassword, verifyPassword } from "../services/password.service";
import { issueTokenPair, rotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from "../services/token.service";
import { createRegistrationOtp, verifyRegistrationOtp, createPasswordResetOtp, verifyPasswordResetOtp, markResetTokenUsed, isResetTokenValid } from "../services/otp.service";
import { sendRegistrationOtpEmail, sendPasswordResetOtpEmail } from "../services/email.service";
import { logAudit } from "../services/audit.service";
import { TokenPayload } from "../services/jwt.service";

// ─── Account Lockout Constants ──────────────────────────────────────────────
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/register
// Full donor registration: creates user + donor_profile + donor_verification
// ═══════════════════════════════════════════════════════════════════════════
export async function register(req: Request, res: Response) {
  const {
    email,
    password,
    fullName,
    phone,
    nic,
    bloodGroup,
    dob,
    documentUrl,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Check if email already exists
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Email already registered" });
    }

    // 2. Check if NIC already exists in donor_profiles
    const nicCheck = await client.query(
      "SELECT id FROM donor_profiles WHERE nic = $1",
      [nic]
    );
    if (nicCheck.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(409)
        .json({ error: "An account with this NIC already exists" });
    }

    // 3. Hash password
    const passwordHash = await hashPassword(password);

    // 4. Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, status)
       VALUES ($1, $2, 'donor', 'active')
       RETURNING id, email, role, status, created_at`,
      [email, passwordHash]
    );
    const user = userResult.rows[0];

    // 5. Create donor profile
    await client.query(
      `INSERT INTO donor_profiles (user_id, full_name, nic, phone, date_of_birth, blood_group)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        user.id,
        fullName,
        nic,
        phone,
        dob || null,
        bloodGroup,
      ]
    );

    // 6. Create donor verification request (pending admin review)
    const docUrl =
      documentUrl || `uploads/donor_${user.id}_verification_pending`;
    await client.query(
      `INSERT INTO donor_verifications (donor_id, document_url, claimed_blood_group, status)
       VALUES ($1, $2, $3, 'pending')`,
      [user.id, docUrl, bloodGroup]
    );

    await client.query("COMMIT");

    // 7. Issue tokens
    const payload: TokenPayload = {
      id: user.id.toString(),
      role: user.role,
      orgId: null,
    };
    const tokens = await issueTokenPair(payload);

    // 8. Audit log
    await logAudit({
      actorUserId: user.id.toString(),
      action: "DONOR_REGISTRATION",
      targetType: "user",
      targetId: user.id.toString(),
      metadata: { email, bloodGroup },
      ipAddress: req.ip || undefined,
    });

    return res.status(201).json({
      message: "Registration successful. Blood group verification is pending.",
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        fullName,
        bloodGroup,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Register error:", err);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  } finally {
    client.release();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/login
// Login with email + password (supports phone lookup too)
// ═══════════════════════════════════════════════════════════════════════════
export async function login(req: Request, res: Response) {
  const { email, phone, password } = req.body;

  try {
    // Build query based on identifier type
    let userQuery: string;
    let queryParam: string;

    if (email) {
      userQuery = `SELECT u.id, u.email, u.password_hash, u.role, u.organization_id, u.status,
                          u.failed_login_attempts, u.locked_until
                   FROM users u WHERE u.email = $1`;
      queryParam = email;
    } else if (phone) {
      userQuery = `SELECT u.id, u.email, u.password_hash, u.role, u.organization_id, u.status,
                          u.failed_login_attempts, u.locked_until
                   FROM users u
                   JOIN donor_profiles dp ON dp.user_id = u.id
                   WHERE dp.phone = $1`;
      queryParam = phone;
    } else {
      return res.status(400).json({ error: "Email or phone number is required" });
    }

    const result = await pool.query(userQuery, [queryParam]);

    // Use generic error message to prevent user enumeration
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    // Check account lockout
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const minutesRemaining = Math.ceil(
        (new Date(user.locked_until).getTime() - Date.now()) / 60000
      );
      return res.status(423).json({
        error: `Account temporarily locked. Try again in ${minutesRemaining} minute(s).`,
      });
    }

    // Verify password
    const isValid = await verifyPassword(user.password_hash, password);

    if (!isValid) {
      // Increment failed attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      const updateFields: string[] = [
        `failed_login_attempts = ${newAttempts}`,
      ];

      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(
          Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000
        );
        updateFields.push(`locked_until = '${lockUntil.toISOString()}'`);

        await logAudit({
          actorUserId: user.id.toString(),
          action: "ACCOUNT_LOCKED",
          targetType: "user",
          targetId: user.id.toString(),
          metadata: { reason: "max_failed_login_attempts", attempts: newAttempts },
          ipAddress: req.ip || undefined,
        });
      }

      await pool.query(
        `UPDATE users SET ${updateFields.join(", ")}, updated_at = NOW() WHERE id = $1`,
        [user.id]
      );

      return res.status(401).json({
        error: "Invalid credentials",
        remainingAttempts: Math.max(0, MAX_FAILED_ATTEMPTS - newAttempts),
      });
    }

    // Check if account is suspended
    if (user.status === "suspended") {
      return res.status(403).json({
        error:
          "Your account is pending administrator verification or has been suspended.",
      });
    }

    // Reset failed attempts on successful login
    await pool.query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Issue token pair
    const payload: TokenPayload = {
      id: user.id.toString(),
      role: user.role,
      orgId: user.organization_id
        ? user.organization_id.toString()
        : null,
    };
    const tokens = await issueTokenPair(payload);

    // Fetch donor profile if exists
    let profile = null;
    if (user.role === "donor") {
      const profileResult = await pool.query(
        `SELECT full_name, blood_group, phone, nic FROM donor_profiles WHERE user_id = $1`,
        [user.id]
      );
      if (profileResult.rows.length > 0) {
        profile = profileResult.rows[0];
      }
    }

    // Audit log
    await logAudit({
      actorUserId: user.id.toString(),
      action: "USER_LOGIN",
      targetType: "user",
      targetId: user.id.toString(),
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        status: user.status,
        ...(profile && {
          fullName: profile.full_name,
          bloodGroup: profile.blood_group,
          phone: profile.phone,
        }),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET /api/auth/me
// Get authenticated user profile
// ═══════════════════════════════════════════════════════════════════════════
export async function getMe(req: Request, res: Response) {
  const authUser = (req as any).user;

  if (!authUser || !authUser.id) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, role, organization_id, status, created_at FROM users WHERE id = $1",
      [authUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];
    if (user.status === "suspended") {
      return res.status(403).json({
        error: "Your account is pending verification or has been suspended.",
      });
    }

    // Fetch donor profile
    let profile = null;
    if (user.role === "donor") {
      const profileResult = await pool.query(
        `SELECT full_name, blood_group, phone, nic, date_of_birth, is_available,
                latitude, longitude, last_donation_date, next_eligible_date
         FROM donor_profiles WHERE user_id = $1`,
        [user.id]
      );
      if (profileResult.rows.length > 0) {
        profile = profileResult.rows[0];
      }
    }

    // Fetch verification status
    let verificationStatus = null;
    if (user.role === "donor") {
      const verResult = await pool.query(
        `SELECT status, claimed_blood_group FROM donor_verifications
         WHERE donor_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );
      if (verResult.rows.length > 0) {
        verificationStatus = verResult.rows[0].status;
      }
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        status: user.status,
        createdAt: user.created_at,
        ...(profile && {
          fullName: profile.full_name,
          bloodGroup: profile.blood_group,
          phone: profile.phone,
          nic: profile.nic,
          dateOfBirth: profile.date_of_birth,
          isAvailable: profile.is_available,
          lastDonationDate: profile.last_donation_date,
          nextEligibleDate: profile.next_eligible_date,
        }),
        ...(verificationStatus && { verificationStatus }),
      },
    });
  } catch (err) {
    console.error("Get me error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/refresh
// Rotate refresh token (secure token rotation with theft detection)
// ═══════════════════════════════════════════════════════════════════════════
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken || typeof refreshToken !== "string") {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const result = await rotateRefreshToken(refreshToken);

    if (!result) {
      return res
        .status(401)
        .json({ error: "Invalid or expired refresh token" });
    }

    return res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: parseInt(result.user.id),
        role: result.user.role,
        organizationId: result.user.orgId
          ? parseInt(result.user.orgId)
          : null,
      },
    });
  } catch (err) {
    console.error("Refresh error:", err);
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/logout
// Invalidate the current refresh token
// ═══════════════════════════════════════════════════════════════════════════
export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (refreshToken) {
    try {
      await revokeRefreshToken(refreshToken);
    } catch {
      // Silently ignore — token may already be invalid
    }
  }

  return res.status(200).json({ message: "Logged out successfully" });
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/send-otp
// Send OTP for registration email/phone verification
// ═══════════════════════════════════════════════════════════════════════════
export async function sendOtp(req: Request, res: Response) {
  const { identifier, type } = req.body;

  try {
    // For email type, check if email is already registered
    if (type === "email") {
      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [identifier]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }
    }

    const otp = await createRegistrationOtp(identifier, type);

    // Send OTP via email
    if (type === "email") {
      await sendRegistrationOtpEmail(identifier, otp);
    } else {
      // For phone: log in dev, integrate SMS gateway in production
      console.log(
        `\n📱 SMS OTP for ${identifier}: ${otp}\n`
      );
    }

    return res.status(200).json({
      message: `Verification code sent to your ${type}`,
      // In dev, include OTP for testing convenience
      ...(process.env.NODE_ENV !== "production" && { devOtp: otp }),
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({ error: "Failed to send verification code" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/verify-otp
// Verify OTP during registration
// ═══════════════════════════════════════════════════════════════════════════
export async function verifyOtp(req: Request, res: Response) {
  const { identifier, type, otp } = req.body;

  if (!identifier || !type) {
    return res
      .status(400)
      .json({ error: "Identifier and type are required" });
  }

  try {
    const result = await verifyRegistrationOtp(identifier, type, otp);

    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({
      message: "Verification successful",
      verified: true,
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// Request password reset OTP
// ═══════════════════════════════════════════════════════════════════════════
export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  try {
    // Always return success to prevent user enumeration
    const result = await pool.query(
      "SELECT id, email, status FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal that the email doesn't exist
      return res.status(200).json({
        message: "If this email is registered, a reset code has been sent.",
      });
    }

    const user = result.rows[0];

    if (user.status === "suspended") {
      return res.status(200).json({
        message: "If this email is registered, a reset code has been sent.",
      });
    }

    // Generate and store OTP
    const otp = await createPasswordResetOtp(user.id);

    // Send OTP email
    await sendPasswordResetOtpEmail(user.email, otp);

    // Audit log
    await logAudit({
      actorUserId: user.id.toString(),
      action: "PASSWORD_RESET_REQUESTED",
      targetType: "user",
      targetId: user.id.toString(),
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({
      message: "If this email is registered, a reset code has been sent.",
      // Dev convenience
      ...(process.env.NODE_ENV !== "production" && { devOtp: otp }),
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/verify-reset-otp
// Verify OTP for password reset
// ═══════════════════════════════════════════════════════════════════════════
export async function verifyResetOtp(req: Request, res: Response) {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ error: "Email and OTP are required" });
  }

  try {
    // Look up user
    const userResult = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const userId = userResult.rows[0].id;

    const result = await verifyPasswordResetOtp(userId, otp);

    if (!result.valid) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({
      message: "OTP verified. You can now reset your password.",
      resetTokenId: result.tokenId,
      resetToken: result.tokenId,
    });
  } catch (err) {
    console.error("Verify reset OTP error:", err);
    return res.status(500).json({ error: "Verification failed" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/auth/reset-password
// Set new password using verified reset token
// ═══════════════════════════════════════════════════════════════════════════
export async function resetPassword(req: Request, res: Response) {
  const { email, password, resetTokenId } = req.body;

  try {
    // Look up user either by email or by reset token ID
    let userResult;
    if (email) {
      userResult = await pool.query(
        "SELECT id, email FROM users WHERE email = $1",
        [email]
      );
    } else if (resetTokenId) {
      userResult = await pool.query(
        `SELECT u.id, u.email FROM password_reset_tokens prt
         JOIN users u ON u.id = prt.user_id
         WHERE prt.id = $1`,
        [resetTokenId]
      );
    } else {
      return res.status(400).json({ error: "Email or reset token is required" });
    }

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const user = userResult.rows[0];

    // Verify that the reset token is still valid
    const tokenValid = await isResetTokenValid(resetTokenId, user.id);
    if (!tokenValid) {
      return res.status(400).json({
        error:
          "Reset session has expired or is invalid. Please start over.",
      });
    }

    // Hash and update password
    const passwordHash = await hashPassword(password);

    await pool.query(
      `UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    // Mark reset token as used
    await markResetTokenUsed(resetTokenId);

    // Revoke all existing refresh tokens (force re-login on all devices)
    await revokeAllUserTokens(user.id);

    // Audit log
    await logAudit({
      actorUserId: user.id.toString(),
      action: "PASSWORD_RESET_COMPLETED",
      targetType: "user",
      targetId: user.id.toString(),
      ipAddress: req.ip || undefined,
    });

    return res.status(200).json({
      message: "Password reset successful. Please sign in with your new password.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Password reset failed" });
  }
}