import { Request, Response } from "express";
import { pool } from "../db";
import { hashPassword } from "../services/password.service";

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
