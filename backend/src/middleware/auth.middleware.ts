import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../services/jwt.service";
import { pool } from "../db";

export interface AuthRequest extends Request { user?: TokenPayload; }

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const match = /^Bearer ([^ ]+)$/i.exec(req.headers.authorization || "");
  if (!match) return res.status(401).json({ error: "No token provided" });
  let payload: TokenPayload;
  try { payload = verifyAccessToken(match[1]); } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  if (!payload.sid || !Number.isInteger(payload.tokenVersion)) return res.status(401).json({ error: "Session expired. Sign in again" });
  try {
    const user = (await pool.query(
      `SELECT u.id, u.role, u.organization_id, u.status, u.token_version,
              o.verification_status AS organization_status, o.type AS organization_type, o.is_active AS organization_active,
              EXISTS (SELECT 1 FROM refresh_tokens r WHERE r.user_id = u.id AND r.family_id = $2 AND NOT r.is_revoked AND r.expires_at > NOW()) AS session_active
       FROM users u LEFT JOIN organizations o ON o.id = u.organization_id WHERE u.id = $1`,
      [payload.id, payload.sid]
    )).rows[0];
    if (!user || user.token_version !== payload.tokenVersion || !user.session_active) return res.status(401).json({ error: "Session expired. Sign in again" });
    if (user.status !== "active" || (["hospital_staff", "bloodbank_staff"].includes(user.role) && (!user.organization_active || user.organization_status !== "approved" || user.organization_type !== (user.role === "hospital_staff" ? "hospital" : "bloodbank")))) return res.status(403).json({ error: "Account is not active or organization is not approved" });
    // Use current database permissions, never stale role claims.
    req.user = { ...payload, role: user.role, orgId: user.organization_id ? String(user.organization_id) : null };
    next();
  } catch (error) { next(error); }
}
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Insufficient permissions" });
    next();
  };
}
export function requireOwnOrganization(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: "Not authenticated" });
  if (!req.user.orgId || req.user.orgId !== req.params.orgId) return res.status(403).json({ error: "Not authorized for this organization" });
  next();
}
