import crypto from "crypto";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "";
if (ACCESS_SECRET.length < 32 || REFRESH_SECRET.length < 32 || ACCESS_SECRET === REFRESH_SECRET ||
    /your_|change-me/i.test(ACCESS_SECRET + REFRESH_SECRET)) {
  throw new Error("Configure distinct, random JWT_ACCESS_SECRET and JWT_REFRESH_SECRET (at least 32 characters each)");
}
export interface TokenPayload {
  id: string;
  role: string;
  orgId: string | null;
  tokenVersion?: number;
  sid?: string;
}
const options = { algorithm: "HS256" as const, issuer: "bloodlink", audience: "bloodlink-app" };
const claims = (payload: TokenPayload) => ({ id: payload.id, role: payload.role, orgId: payload.orgId, tokenVersion: payload.tokenVersion, sid: payload.sid });
export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign({ ...claims(payload), tokenType: "access" }, ACCESS_SECRET, { ...options, expiresIn: "15m", jwtid: crypto.randomUUID() });
}
export function signRefreshToken(payload: TokenPayload & { familyId?: string }): string {
  return jwt.sign({ ...claims(payload), familyId: payload.familyId, tokenType: "refresh" }, REFRESH_SECRET, { ...options, expiresIn: "7d", jwtid: crypto.randomUUID() });
}
function verify(token: string, secret: string, type: string): TokenPayload & { familyId?: string } {
  const decoded = jwt.verify(token, secret, { algorithms: ["HS256"], issuer: options.issuer, audience: options.audience });
  if (typeof decoded === "string" || decoded.tokenType !== type ||
      typeof decoded.id !== "string" || !/^[1-9][0-9]*$/.test(decoded.id) ||
      Number(decoded.id) > 2147483647 ||
      !["donor", "admin", "hospital_staff", "bloodbank_staff"].includes(decoded.role) ||
      !(decoded.orgId === null || (typeof decoded.orgId === "string" && /^[1-9][0-9]*$/.test(decoded.orgId)))) {
    throw new Error("Invalid token claims");
  }
  return decoded as TokenPayload & { familyId?: string };
}
export const verifyAccessToken = (token: string) => verify(token, ACCESS_SECRET, "access");
export const verifyRefreshToken = (token: string) => verify(token, REFRESH_SECRET, "refresh");
