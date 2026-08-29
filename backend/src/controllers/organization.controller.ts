import { Request, Response } from "express";
import { pool } from "../db";

export async function registerOrganization(req: Request, res: Response) {
  const { name, type, registrationEvidenceUrl } = req.body;

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
    console.error("Register organization error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function listPendingOrganizations(req: Request, res: Response) {
  try {
    const result = await pool.query(
      `SELECT id, name, type, registration_evidence_url, verification_status, created_at
       FROM organizations
       WHERE verification_status = 'pending'
       ORDER BY created_at ASC`,
    );

    return res.status(200).json({ organizations: result.rows });
  } catch (err) {
    console.error("List pending organizations error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function approveOrganization(req: Request, res: Response) {
  const { id } = req.params;
  const adminId = (req as any).user.id;

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

    return res.status(200).json({ organization: result.rows[0] });
  } catch (err) {
    console.error("Approve organization error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function rejectOrganization(req: Request, res: Response) {
  const { id } = req.params;
  const adminId = (req as any).user.id;

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

    return res.status(200).json({ organization: result.rows[0] });
  } catch (err) {
    console.error("Reject organization error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
