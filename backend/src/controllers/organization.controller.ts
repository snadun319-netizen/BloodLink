import { AuthRequest } from '../middleware/auth.middleware';
import { Response } from 'express';
import { pool } from '../db';
import { transaction, HttpError } from '../transaction';
import { audit } from '../services/coordination.service';

export async function registerOrganization(req: AuthRequest, res: Response) {
  const { name, type, registrationEvidenceUrl } = req.body;
  if (type === 'bloodbank') throw new HttpError(403, 'Blood banks are registered by a platform administrator');
  const row = (await pool.query(`INSERT INTO organizations(name, type, registration_evidence_url)
    VALUES ($1, $2, $3) RETURNING id, name, type, verification_status, created_at`, [name, type, registrationEvidenceUrl || null])).rows[0];
  res.status(201).json({ organization: row });
}

export async function listPendingOrganizations(_req: AuthRequest, res: Response) {
  const result = await pool.query(`SELECT id, name, type, registration_evidence_url, verification_status, created_at
    FROM organizations WHERE verification_status = 'pending' ORDER BY created_at, id LIMIT 1000`);
  res.json({ organizations: result.rows });
}

async function reviewOrganization(req: AuthRequest, res: Response, status: 'approved' | 'rejected') {
  const row = await transaction(async client => {
    const result = (await client.query(`UPDATE organizations SET verification_status = $1, verified_by = $2, verified_at = NOW()
      WHERE id = $3 AND verification_status = 'pending' RETURNING id, name, type, verification_status`, [status, req.user!.id, req.params.id])).rows[0];
    if (!result) throw new HttpError(404, 'Organization not found or already processed');
    await audit(client, req, status === 'approved' ? 'ORGANIZATION_APPROVED' : 'ORGANIZATION_REJECTED', 'organization', result.id, { organizationName: result.name });
    return result;
  });
  res.json({ organization: row });
}
export async function approveOrganization(req: AuthRequest, res: Response) { await reviewOrganization(req, res, 'approved'); }
export async function rejectOrganization(req: AuthRequest, res: Response) { await reviewOrganization(req, res, 'rejected'); }
