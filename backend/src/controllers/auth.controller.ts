import { Request, Response } from "express";
import { pool } from "../db";
import { hashPassword, verifyPassword } from "../services/password.service";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../services/jwt.service";

export async function register(req: Request, res: Response) {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res
      .status(400)
      .json({ error: "Email, password, and role are required" });
  }

  const allowedRoles = ["donor", "hospital_staff", "bloodbank_staff"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  if (role === "hospital_staff" || role === "bloodbank_staff") {
    return res.status(400).json({
      error:
        "Staff accounts must be registered via /api/staff/register with an approved organization",
    });
  }

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, status",
      [email, passwordHash, role],
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash, role, organization_id, status FROM users WHERE email = $1",
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const isValid = await verifyPassword(user.password_hash, password);

    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        error:
          "Your account is pending administrator verification or has been suspended.",
      });
    }

    const payload = {
      id: user.id.toString(),
      role: user.role,
      orgId: user.organization_id ? user.organization_id.toString() : null,
    };

    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    return res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        status: user.status,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function getMe(req: Request, res: Response) {
  const authUser = (req as any).user;

  if (!authUser || !authUser.id) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, role, organization_id, status, created_at FROM users WHERE id = $1",
      [authUser.id],
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

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        status: user.status,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    console.error("Get me error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    const result = await pool.query(
      "SELECT id, email, role, organization_id, status FROM users WHERE id = $1",
      [payload.id],
    );

    if (result.rows.length === 0) {
      return res
        .status(401)
        .json({ error: "Invalid refresh token: user not found" });
    }

    const user = result.rows[0];
    if (user.status === "suspended") {
      return res.status(403).json({
        error:
          "Your account is pending verification or has been suspended.",
      });
    }

    const newPayload = {
      id: user.id.toString(),
      role: user.role,
      orgId: user.organization_id ? user.organization_id.toString() : null,
    };

    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organization_id,
        status: user.status,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }
}