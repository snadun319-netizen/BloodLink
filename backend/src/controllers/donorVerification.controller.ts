import { AuthRequest } from "../middleware/auth.middleware";
import { Response, NextFunction } from "express";
import { pool } from "../db";
import { logAudit } from "../services/audit.service";
import { transaction } from "../transaction";

export async function submitDonorVerification(req: AuthRequest, res: Response, next: NextFunction) {
  const donorId = req.user!.id;
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
    return next(err);
  }
}

export async function listPendingDonorVerifications(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
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
    return next(err);
  }
}

export async function approveDonorVerification(req: AuthRequest, res: Response, next: NextFunction) {
  const { id } = req.params;
  const adminId = req.user!.id;

  try {
    const result = await transaction(async client => {
      const updated = await client.query(
      `UPDATE donor_verifications
       SET status = 'approved', reviewed_by = $1, reviewed_at = NOW()
       WHERE id = $2 AND status = 'pending'
       RETURNING id, donor_id, claimed_blood_group, status`,
      [adminId, id],
      );
      if (updated.rows.length) await client.query(
        "UPDATE donor_profiles SET blood_group = $1, blood_group_verified = true, updated_at = NOW() WHERE user_id = $2",
        [updated.rows[0].claimed_blood_group, updated.rows[0].donor_id]
      );
      return updated;
    });

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Verification not found or already processed" });
    }

    await logAudit({
      actorUserId: adminId,
      action: "DONOR_VERIFICATION_APPROVED",
      targetType: "donor_verification",
      targetId: id as string,
      metadata: {
        donorId: result.rows[0].donor_id,
        bloodGroup: result.rows[0].claimed_blood_group,
      },
    });

    return res.status(200).json({ verification: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}

export async function rejectDonorVerification(req: AuthRequest, res: Response, next: NextFunction) {
  const { id } = req.params;
  const { reason } = req.body;
  const adminId = req.user!.id;

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

    await logAudit({
      actorUserId: adminId,
      action: "DONOR_VERIFICATION_REJECTED",
      targetType: "donor_verification",
      targetId: id as string,
      metadata: { donorId: result.rows[0].donor_id, reason: reason || null },
    });

    return res.status(200).json({ verification: result.rows[0] });
  } catch (err) {
    return next(err);
  }
}
