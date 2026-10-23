import { AuthRequest } from "../middleware/auth.middleware";
import { Response, NextFunction } from "express";
import { pool } from "../db";
import { logAudit } from "../services/audit.service";

export async function registerOrganization(req: AuthRequest, res: Response, next: NextFunction) {
  const { name, type, registrationEvidenceUrl } = req.body;
  if (type === "bloodbank") return res.status(403).json({ error: "Blood banks are registered by a platform administrator" });

  if (!name || !type) {
    return res.status(400).json({ error: "Name and type are required" });
  }

  const allowedTypes = ["hospital", "bloodbank"];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: "Invalid organization type" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO organizations (name, type, registration_evidence_url)
       VALUES ($1, $2, $3)
       RETURNING id, name, type, verification_status, created_at`,
      [name, type, registrationEvidenceUrl || null],
    );

    return res.status(201).json({ organization: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function listPendingOrganizations(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const result = await pool.query(
      `SELECT id, name, type, registration_evidence_url, verification_status, created_at
       FROM organizations
       WHERE verification_status = 'pending'
       ORDER BY created_at ASC`,
    );

    return res.status(200).json({ organizations: result.rows });
  } catch (err) {
    return next(err);
  }
}

export async function approveOrganization(req: AuthRequest, res: Response, next: NextFunction) {
  const { id } = req.params;
  const adminId = req.user!.id;

  try {
    const result = await pool.query(
      `UPDATE organizations
       SET verification_status = 'approved', verified_by = $1, verified_at = NOW()
       WHERE id = $2 AND verification_status = 'pending'
       RETURNING id, name, type, verification_status`,
      [adminId, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Organization not found or already processed" });
    }

    await logAudit({
      actorUserId: adminId,
      action: "ORGANIZATION_APPROVED",
      targetType: "organization",
      targetId: id as string,
      metadata: { organizationName: result.rows[0].name },
    });

    return res.status(200).json({ organization: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function rejectOrganization(req: AuthRequest, res: Response, next: NextFunction) {
  const { id } = req.params;
  const adminId = req.user!.id;

  try {
    const result = await pool.query(
      `UPDATE organizations
       SET verification_status = 'rejected', verified_by = $1, verified_at = NOW()
       WHERE id = $2 AND verification_status = 'pending'
       RETURNING id, name, type, verification_status`,
      [adminId, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Organization not found or already processed" });
    }

    await logAudit({
      actorUserId: adminId,
      action: "ORGANIZATION_REJECTED",
      targetType: "organization",
      targetId: id as string,
      metadata: { organizationName: result.rows[0].name },
    });

    return res.status(200).json({ organization: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}
