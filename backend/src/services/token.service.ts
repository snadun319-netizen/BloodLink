import crypto from "crypto";
import { pool } from "../db";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from "./jwt.service";

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

/**
 * Hash a refresh token for secure storage using SHA-256.
 * Unlike passwords, refresh tokens are high-entropy random strings,
 * so SHA-256 is sufficient and much faster than argon2.
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a unique family ID for refresh token rotation tracking.
 * All tokens in the same "family" descend from the same original login.
 */
function generateFamilyId(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Issue a new access + refresh token pair and store the refresh token.
 * This is used on login and token refresh.
 */
export async function issueTokenPair(
  payload: TokenPayload,
  familyId?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  familyId: string;
}> {
  const family = familyId || generateFamilyId();

  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken({ ...payload, familyId: family });

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(
    Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000
  );

  // Store refresh token hash in database
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [parseInt(payload.id), tokenHash, family, expiresAt]
  );

  return { accessToken, refreshToken, familyId: family };
}

/**
 * Rotate a refresh token:
 * 1. Verify the old token
 * 2. Check it exists in DB and is not revoked
 * 3. Revoke the old token
 * 4. Issue a new token pair in the same family
 *
 * If a revoked token is reused, the ENTIRE family is revoked
 * (indicates potential token theft).
 */
export async function rotateRefreshToken(oldRefreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  user: TokenPayload;
} | null> {
  // 1. Verify JWT signature and expiry
  let payload: TokenPayload & { familyId?: string };
  try {
    payload = verifyRefreshToken(oldRefreshToken) as TokenPayload & {
      familyId?: string;
    };
  } catch {
    return null;
  }

  const tokenHash = hashToken(oldRefreshToken);

  // 2. Look up the token in DB
  const result = await pool.query(
    `SELECT id, user_id, family_id, is_revoked, expires_at
     FROM refresh_tokens
     WHERE token_hash = $1`,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const storedToken = result.rows[0];

  // 3. If the token was already revoked → token theft detected!
  //    Revoke the ENTIRE family to lock out the attacker.
  if (storedToken.is_revoked) {
    console.warn(
      `🚨 SECURITY: Refresh token reuse detected for family ${storedToken.family_id}! Revoking entire family.`
    );
    await pool.query(
      `UPDATE refresh_tokens SET is_revoked = true WHERE family_id = $1`,
      [storedToken.family_id]
    );
    return null;
  }

  // 4. Check expiry
  if (new Date(storedToken.expires_at) < new Date()) {
    return null;
  }

  // 5. Revoke the old token
  await pool.query(`UPDATE refresh_tokens SET is_revoked = true WHERE id = $1`, [
    storedToken.id,
  ]);

  // 6. Verify user still exists and is active
  const userResult = await pool.query(
    `SELECT id, email, role, organization_id, status FROM users WHERE id = $1`,
    [storedToken.user_id]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  const user = userResult.rows[0];
  if (user.status === "suspended") {
    return null;
  }

  // 7. Issue new token pair in the same family
  const newPayload: TokenPayload = {
    id: user.id.toString(),
    role: user.role,
    orgId: user.organization_id ? user.organization_id.toString() : null,
  };

  const { accessToken, refreshToken } = await issueTokenPair(
    newPayload,
    storedToken.family_id
  );

  return {
    accessToken,
    refreshToken,
    user: newPayload,
  };
}

/**
 * Revoke all refresh tokens for a user (e.g., on logout, password change).
 */
export async function revokeAllUserTokens(userId: number): Promise<void> {
  await pool.query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Revoke a specific refresh token by its raw token string.
 */
export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await pool.query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE token_hash = $1`,
    [tokenHash]
  );
}

/**
 * Cleanup expired and revoked tokens (can be run periodically).
 */
export async function cleanupExpiredTokens(): Promise<void> {
  await pool.query(
    `DELETE FROM refresh_tokens WHERE expires_at < NOW() OR is_revoked = true`
  );
}
