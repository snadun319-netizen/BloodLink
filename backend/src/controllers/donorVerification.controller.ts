import { Request, Response } from "express";
import { pool } from "../db";

export async function submitDonorVerification(req: Request, res: Response) {
  const donorId = (req as any).user.id;
  const { documentUrl, claimedBloodGroup } = req.body;

  if (!documentUrl || !claimedBloodGroup) {
    return res
      .status(400)
      .json({ error: "Document URL and blood group are required" });
  }

  const allowedBloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  if (!allowedBloodGroups.includes(claimedBloodGroup)) {
    return res.status(400).json({ error: "Invalid blood group" });
  }

  try {
    const pending = await pool.query(
      `SELECT id FROM donor_verifications WHERE donor_id = $1 AND status = 'pending'`,
      [donorId],
    );

    if (pending.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "You already have a pending verification request" });
    }

    const result = await pool.query(
      `INSERT INTO donor_verifications (donor_id, document_url, claimed_blood_group)
       VALUES ($1, $2, $3)
       RETURNING id, claimed_blood_group, status, created_at`,
      [donorId, documentUrl, claimedBloodGroup],
    );

    return res.status(201).json({ verification: result.rows[0] });
  } catch (err) {
    console.error("Submit donor verification error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function listPendingDonorVerifications(
  req: Request,
  res: Response,
) {
  try {
    const result = await pool.query(
      `SELECT dv.id, dv.donor_id, u.email AS donor_email, dv.document_url,
              dv.claimed_blood_group, dv.status, dv.created_at
       FROM donor_verifications dv
       JOIN users u ON dv.donor_id = u.id
       WHERE dv.status = 'pending'
       ORDER BY dv.created_at ASC`,
    );

    return res.status(200).json({ verifications: result.rows });
  } catch (err) {
    console.error("List pending donor verifications error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function approveDonorVerification(req: Request, res: Response) {
  const { id } = req.params;
  const adminId = (req as any).user.id;

  try {
    const result = await pool.query(
      `UPDATE donor_verifications
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING id, donor_id, claimed_blood_group, status`,
      [adminId, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Verification not found or already processed" });
    }

    return res.status(200).json({ verification: result.rows[0] });
  } catch (err) {
    console.error("Approve donor verification error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

export async function rejectDonorVerification(req: Request, res: Response) {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = (req as any).user.id;

  try {
    const result = await pool.query(
      `UPDATE donor_verifications
       SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), rejection_reason = $2
       WHERE id = $3 AND status = 'pending'
       RETURNING id, donor_id, claimed_blood_group, status, rejection_reason`,
      [adminId, reason || null, id],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Verification not found or already processed" });
    }

    return res.status(200).json({ verification: result.rows[0] });
  } catch (err) {
    console.error("Reject donor verification error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}
