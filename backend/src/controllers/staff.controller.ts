import { AuthRequest } from "../middleware/auth.middleware";
import { Response, NextFunction } from "express";
import { pool } from "../db";
import { hashPassword } from "../services/password.service";
import { logAudit } from "../services/audit.service";

export async function registerStaff(req: AuthRequest, res: Response, next: NextFunction) {
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
      `SELECT id, type, verification_status, is_active FROM organizations WHERE id = $1`,
      [organizationId],
    );

    if (org.rows.length === 0) {
      return res.status(404).json({ error: "Organization not found" });
    }

    if (org.rows[0].verification_status !== "approved" || !org.rows[0].is_active) {
      return res
        .status(403)
        .json({ error: "Organization is not yet approved" });
    }

    if (org.rows[0].type !== (role === "hospital_staff" ? "hospital" : "bloodbank")) {
      return res.status(400).json({ error: "Staff role does not match organization type" });
    }
    if (role === "bloodbank_staff") return res.status(403).json({ error: "Blood bank accounts are provided by a platform administrator" });

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
    return next(err);
  }
}

export async function listPendingStaff(req: AuthRequest, res: Response, next: NextFunction) {
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
    return next(err);
  }
}

export async function approveStaff(req: AuthRequest, res: Response, next: NextFunction) {
  const { id } = req.params;
  const adminId = req.user!.id;

  try {
    const result = await pool.query(
      `UPDATE users
       SET status = 'active'
       WHERE id = $1 AND status = 'suspended' AND role IN ('hospital_staff', 'bloodbank_staff')
         AND EXISTS (SELECT 1 FROM organizations o WHERE o.id = users.organization_id AND o.verification_status = 'approved' AND o.is_active
           AND o.type = CASE users.role WHEN 'hospital_staff' THEN 'hospital' ELSE 'bloodbank' END)
       RETURNING id, email, role, status`,
      [id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Staff member not found or already processed" });
    }

    await logAudit({
      actorUserId: adminId,
      action: "STAFF_APPROVED",
      targetType: "user",
      targetId: id as string,
      metadata: { email: result.rows[0].email, role: result.rows[0].role },
    });

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function rejectStaff(req: AuthRequest, res: Response, next: NextFunction) {
  const { id } = req.params;
  const adminId = req.user!.id;

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

    await logAudit({
      actorUserId: adminId,
      action: "STAFF_REJECTED",
      targetType: "user",
      targetId: id as string,
      metadata: { email: result.rows[0].email },
    });

    return res
      .status(200)
      .json({ message: "Staff registration rejected", user: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}
