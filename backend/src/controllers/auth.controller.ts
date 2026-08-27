import { Request, Response } from "express";
import { pool } from "../db";
import { hashPassword, verifyPassword } from "../services/password.service";
import { signAccessToken, signRefreshToken } from "../services/jwt.service";

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

  try {
    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role",
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
      "SELECT id, email, password_hash, role, organization_id FROM users WHERE email = $1",
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
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}