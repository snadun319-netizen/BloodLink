import crypto from "crypto";
import { PoolClient } from "pg";
import { pool } from "../db";
import { transaction, HttpError } from "../transaction";
import { signAccessToken, signRefreshToken, verifyRefreshToken, TokenPayload } from "./jwt.service";

export const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

export async function issueTokenPair(payload: TokenPayload, familyId?: string, client?: PoolClient): Promise<{
  accessToken: string; refreshToken: string; familyId: string;
}> {
  if (!client) return transaction(tx => issueTokenPair(payload, familyId, tx));
  const user = (await client.query("SELECT id, role, organization_id, status, token_version FROM users WHERE id = $1 FOR UPDATE", [payload.id])).rows[0];
  if (!user || user.status !== "active") throw new HttpError(403, "Account is not active");
  if (["hospital_staff", "bloodbank_staff"].includes(user.role)) {
    const organization = (await client.query("SELECT type, verification_status FROM organizations WHERE id = $1", [user.organization_id])).rows[0];
    if (!organization || organization.verification_status !== "approved" || organization.type !== (user.role === "hospital_staff" ? "hospital" : "bloodbank")) throw new HttpError(403, "Staff organization is not approved for this role");
  }
  const family = familyId || crypto.randomBytes(32).toString("hex");
  const current: TokenPayload = { id: String(user.id), role: user.role, orgId: user.organization_id ? String(user.organization_id) : null, tokenVersion: user.token_version, sid: family };
  const accessToken = signAccessToken(current);
  const refreshToken = signRefreshToken({ ...current, familyId: family });
  await client.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at) VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')",
    [user.id, hashToken(refreshToken), family]
  );
  return { accessToken, refreshToken, familyId: family };
}

export async function rotateRefreshToken(token: string): Promise<{ accessToken: string; refreshToken: string; user: TokenPayload } | null> {
  let payload: TokenPayload & { familyId?: string };
  try { payload = verifyRefreshToken(token); } catch { return null; }
  return transaction(async client => {
    // Serialize all session mutations on the user, consistently before token rows.
    const user = (await client.query("SELECT id, role, organization_id, status, token_version FROM users WHERE id = $1 FOR UPDATE", [payload.id])).rows[0];
    if (!user || user.status !== "active" || user.token_version !== payload.tokenVersion) return null;
    if (["hospital_staff", "bloodbank_staff"].includes(user.role)) {
      const organization = (await client.query("SELECT type, verification_status FROM organizations WHERE id = $1", [user.organization_id])).rows[0];
      if (!organization || organization.verification_status !== "approved" || organization.type !== (user.role === "hospital_staff" ? "hospital" : "bloodbank")) {
        await revokeAllUserTokens(user.id, client);
        return null;
      }
    }
    const stored = (await client.query(
      "SELECT *, expires_at > NOW() AS unexpired FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2 FOR UPDATE",
      [hashToken(token), user.id]
    )).rows[0];
    if (!stored || stored.family_id !== payload.familyId) return null;
    if (stored.is_revoked) {
      await client.query("UPDATE refresh_tokens SET is_revoked = true WHERE family_id = $1 AND user_id = $2", [stored.family_id, user.id]);
      return null;
    }
    if (!stored.unexpired) return null;
    await client.query("UPDATE refresh_tokens SET is_revoked = true WHERE id = $1", [stored.id]);
    const current = { id: String(user.id), role: user.role, orgId: user.organization_id ? String(user.organization_id) : null, tokenVersion: user.token_version, sid: stored.family_id };
    const pair = await issueTokenPair(current, stored.family_id, client);
    return { accessToken: pair.accessToken, refreshToken: pair.refreshToken, user: current };
  });
}
export async function revokeAllUserTokens(userId: number, client?: PoolClient): Promise<void> {
  if (!client) return transaction(tx => revokeAllUserTokens(userId, tx));
  await client.query("UPDATE users SET token_version = token_version + 1, updated_at = NOW() WHERE id = $1", [userId]);
  await client.query("UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1", [userId]);
}
export async function revokeRefreshToken(token: string): Promise<void> {
  let payload: TokenPayload;
  try { payload = verifyRefreshToken(token); } catch { return; }
  await transaction(async client => {
    await client.query("SELECT id FROM users WHERE id = $1 FOR UPDATE", [payload.id]);
    // Logout ends the entire session, including access tokens and rotated descendants.
    await client.query(
      "UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1 AND family_id IN (SELECT family_id FROM refresh_tokens WHERE token_hash = $2 AND user_id = $1)",
      [payload.id, hashToken(token)]
    );
  });
}
export async function cleanupExpiredTokens(): Promise<void> {
  // Retain revoked ancestors until the last descendant expires so reuse stays detectable.
  await pool.query("DELETE FROM refresh_tokens r WHERE NOT EXISTS (SELECT 1 FROM refresh_tokens sibling WHERE sibling.family_id = r.family_id AND sibling.expires_at > NOW())");
}
