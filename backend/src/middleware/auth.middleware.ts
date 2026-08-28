import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../services/jwt.service";

export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}

export function requireOwnOrganization(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const requestedOrgId = req.params.orgId;

  if (req.user.orgId !== requestedOrgId) {
    return res
      .status(403)
      .json({ error: "Not authorized for this organization" });
  }

  next();
}
