import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { positiveId, text } from '../middleware/validation.middleware';
import { pool } from '../db';
import { transaction, HttpError } from '../transaction';
import { audit, dispatchMatches, lockRequest } from '../services/coordination.service';

export async function listRequestReviews(req: AuthRequest, res: Response) {
  const status = req.query.approvalStatus;
  if (status !== undefined && !['Pending', 'Approved', 'Rejected'].includes(status as string)) throw new HttpError(400, 'Invalid approval status');
  const requests = (await pool.query(`SELECT r.*, o.name AS organization_name, o.district,
    o.branch_name, o.is_active AS organization_active, o.verification_status AS organization_status,
    u.email AS created_by_email, reviewer.email AS reviewed_by_email
    FROM blood_requests r JOIN organizations o ON o.id = r.organization_id
    LEFT JOIN users u ON u.id = r.created_by LEFT JOIN users reviewer ON reviewer.id = r.reviewed_by
    WHERE ($1::text IS NULL OR r.approval_status = $1)
    ORDER BY CASE WHEN r.approval_status = 'Pending' AND r.status = 'Active' THEN 0 ELSE 1 END,
      CASE r.priority WHEN 'Emergency' THEN 0 WHEN 'Urgent' THEN 1 ELSE 2 END, r.id DESC LIMIT 1000`, [status || null])).rows;
  res.json({ requests });
}

export async function reviewBloodRequest(req: AuthRequest, res: Response) {
  const id = positiveId(req.params.id), decision = req.body.decision;
  if (!['Approved', 'Rejected'].includes(decision)) throw new HttpError(400, 'Decision must be Approved or Rejected');
  const reason = decision === 'Rejected' ? text(req.body.reason, 'reason', 2000) : null;
  const result = await transaction(async client => {
    const existing = await lockRequest(client, id);
    if (existing.status !== 'Active' || existing.approval_status !== 'Pending') throw new HttpError(409, 'Only pending open requests can be reviewed');
    const request = (await client.query(`UPDATE blood_requests SET approval_status = $1,
      reviewed_by = $2, reviewed_at = NOW(), review_reason = $3, updated_at = NOW()
      WHERE id = $4 RETURNING *`, [decision, req.user!.id, reason, id])).rows[0];
    const matchedDonors = decision === 'Approved' ? await dispatchMatches(client, id) : 0;
    await audit(client, req, 'BLOOD_REQUEST_REVIEWED', 'blood_request', id, { decision, matchedDonors });
    return { request, matchedDonors };
  });
  res.json(result);
}
