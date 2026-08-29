import { Request, Response } from "express";
import { pool } from "../db";
import { hashPassword } from "../services/password.service";

export async function registerStaff(req: Request, res: Response) {
  const { email, password, role, organizationId } = req.body;

  if (!email || !password || !role || !organizationId) {
    return res.status(400).json({
      error: "Email, password, role, and organizationId are required",
    });
  }

  const allowedRoles = ["hospital_staff", "bloodbank_staff"];
  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    const org = await pool.query(
      `SELECT id, verification_status FROM organizations WHERE id = $1`,
      [organizationId],
    );

    if (org.rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    if (org.rows[0].verification_status !== "approved") {
      return res
        .status(403)
        .json({ error: "Organization is not yet approved" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email,
    ]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, role, organization_id, status)
       VALUES ($1, $2, $3, $4, 'suspended')
       RETURNING id, email, role, organization_id, status`,
      [email, passwordHash, role, organizationId],
    );

    return res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    console.error("Register staff error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function listPendingStaff(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.role, u.status, u.created_at,
              o.name AS organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.status = 'suspended' AND u.role IN ('hospital_staff', 'bloodbank_staff')
       ORDER BY u.created_at ASC`,
    );

    return res.status(200).json({ staff: result.rows });
  } catch (err) {
    console.error("List pending staff error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function approveStaff(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE users
       SET status = 'active'
       WHERE id = $1 AND status = 'suspended' AND role IN ('hospital_staff', 'bloodbank_staff')
       RETURNING id, email, role, status`,
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Staff member not found or already processed" });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error("Approve staff error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function rejectStaff(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM users
       WHERE id = $1 AND status = 'suspended' AND role IN ('hospital_staff', 'bloodbank_staff')
       RETURNING id, email`,
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Staff member not found or already processed" });
    }

    return res
      .status(200)
      .json({ message: "Staff registration rejected", user: result.rows[0] });
  } catch (err) {
    console.error("Reject staff error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
