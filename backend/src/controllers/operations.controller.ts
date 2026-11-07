import { Response } from 'express';
import { PoolClient } from 'pg';
import { AuthRequest } from '../middleware/auth.middleware';
import { BLOOD_GROUPS, positiveId, emailValue, optionalText, validatePasswordStrength } from '../middleware/validation.middleware';
import { pool } from '../db';
import { transaction, HttpError } from '../transaction';
import { audit, dispatchMatches, donationIntervalDays, lockRequest, lockDonor, queueNotificationPush, requestCoverage } from '../services/coordination.service';
import { hashPassword } from '../services/password.service';
import { revokeAllUserTokens } from '../services/token.service';

function ownRequest(req: AuthRequest, request: any) {
  if (String(request.organization_id) !== req.user!.orgId) throw new HttpError(404, 'Blood request not found');
}
async function activeInstitution(client: PoolClient, req: AuthRequest) {
  const row = (await client.query('SELECT * FROM organizations WHERE id = $1 FOR SHARE', [req.user!.orgId])).rows[0];
  if (!row?.is_active || row.verification_status !== 'approved') throw new HttpError(403, 'Institution is not active and approved');
  return row;
}
const stockStatus = (units: number) => units <= 2 ? 'Critical' : units < 10 ? 'Low' : 'Normal';

export async function listStocks(req: AuthRequest, res: Response) {
  const stocks = (await pool.query('SELECT blood_group, available_units, status, updated_at FROM blood_stocks WHERE organization_id = $1 ORDER BY blood_group', [req.user!.orgId])).rows;
  res.json({ stocks: BLOOD_GROUPS.map(group => stocks.find(row => row.blood_group === group) || { blood_group: group, available_units: 0, status: 'Critical', updated_at: null }) });
}

export async function updateStock(req: AuthRequest, res: Response) {
  const group = String(req.params.bloodGroup), units = req.body.availableUnits;
  if (!BLOOD_GROUPS.includes(group) || !Number.isInteger(units) || units < 0 || units > 100000) throw new HttpError(400, 'A valid blood group and integer availableUnits between 0 and 100000 are required');
  const expected = req.body.expectedUpdatedAt;
  if (expected != null && (typeof expected !== 'string' || !Number.isFinite(Date.parse(expected)))) throw new HttpError(400, 'Invalid expectedUpdatedAt');
  const stock = await transaction(async client => {
    await activeInstitution(client, req);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`stock:${req.user!.orgId}:${group}`]);
    const existing = (await client.query('SELECT * FROM blood_stocks WHERE organization_id = $1 AND blood_group = $2 FOR UPDATE', [req.user!.orgId, group])).rows[0];
    if (existing && (!expected || new Date(existing.updated_at).getTime() !== Date.parse(expected))) throw new HttpError(409, 'Stock changed. Reload and submit its current expectedUpdatedAt');
    const row = (await client.query(`INSERT INTO blood_stocks(organization_id, blood_group, available_units, status)
      VALUES ($1, $2, $3, $4) ON CONFLICT (organization_id, blood_group) DO UPDATE
      SET available_units = $3, status = $4, updated_at = GREATEST(clock_timestamp(), blood_stocks.updated_at + INTERVAL '1 millisecond') RETURNING *`, [req.user!.orgId, group, units, stockStatus(units)])).rows[0];
    await audit(client, req, 'STOCK_UPDATED', 'blood_stock', row.id, { bloodGroup: group, previousUnits: existing?.available_units || 0, availableUnits: units });
    return row;
  });
  res.json({ stock });
}

export async function createBloodRequest(req: AuthRequest, res: Response) {
  const { bloodGroup, requiredUnits } = req.body, priority = req.body.priority ?? 'Normal', radius = req.body.radiusKm ?? 20;
  const reason = optionalText(req.body.reason, 'reason', 1000);
  const department = optionalText(req.body.department, 'department', 150);
  const outreachTarget = req.body.outreachTarget ?? 10, responseHours = req.body.responseHours ?? 24;
  if (!Number.isInteger(outreachTarget) || outreachTarget<1 || outreachTarget>10000 || !Number.isInteger(responseHours) || responseHours<1 || responseHours>168) throw new HttpError(400,'Invalid outreachTarget or responseHours');
  if (!BLOOD_GROUPS.includes(bloodGroup) || !Number.isInteger(requiredUnits) || requiredUnits < 1 || requiredUnits > 1000 ||
    !['Normal', 'Urgent', 'Emergency'].includes(priority) || typeof radius !== 'number' || !Number.isFinite(radius) || radius <= 0 || radius > 500) throw new HttpError(400, 'Invalid blood group, requiredUnits, priority or radiusKm');
  const result = await transaction(async client => {
    const org = await activeInstitution(client, req);
    if (org.latitude == null || org.longitude == null) throw new HttpError(409, 'Set the institution location before creating requests');
    const request = (await client.query(`INSERT INTO blood_requests(organization_id, blood_group, required_units, priority, radius_km, created_by, reason, department,outreach_target,expires_at,is_simulated)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()+$10::integer*INTERVAL '1 hour',$11) RETURNING *`, [org.id,bloodGroup,requiredUnits,priority,radius,req.user!.id,reason,department,outreachTarget,responseHours,org.is_simulated])).rows[0];
    await audit(client, req, 'BLOOD_REQUEST_SUBMITTED', 'blood_request', request.id);
    return { request, matchedDonors: 0 };
  });
  res.status(201).json(result);
}

export async function listInstitutionRequests(req: AuthRequest, res: Response) {
  const { status } = req.query;
  if (status !== undefined && !['Active', 'Fulfilled', 'Cancelled'].includes(status as string)) throw new HttpError(400, 'Invalid status filter');
  const rows = (await pool.query(`SELECT r.*,
    (SELECT COUNT(*)::integer FROM notifications n WHERE n.request_id = r.id AND n.response_status = 'accepted' AND n.closed_at IS NULL) AS accepted_donors,
    (SELECT COALESCE(SUM(d.units_donated), 0)::integer FROM donations d WHERE d.request_id = r.id) AS donated_units
    FROM blood_requests r WHERE r.organization_id = $1 AND ($2::text IS NULL OR r.status = $2)
    ORDER BY r.id DESC LIMIT 100`, [req.user!.orgId, status || null])).rows;
  res.json({ requests: rows });
}

export async function institutionRequestDetails(req: AuthRequest, res: Response) {
  const id = positiveId(req.params.id);
  const request = (await pool.query('SELECT * FROM blood_requests WHERE id = $1 AND organization_id = $2', [id, req.user!.orgId])).rows[0];
  if (!request) throw new HttpError(404, 'Blood request not found');
  const responses = (await pool.query(`SELECT n.donor_id, n.response_status, n.responded_at, n.closed_at,
    CASE WHEN n.response_status = 'accepted' THEN dp.full_name END AS full_name,
    CASE WHEN n.response_status = 'accepted' THEN dp.phone END AS phone
    FROM notifications n JOIN donor_profiles dp ON dp.user_id = n.donor_id WHERE n.request_id = $1 ORDER BY n.id DESC LIMIT 1000`, [id])).rows;
  const messages = (await pool.query('SELECT id, donor_id, message, created_at FROM coordinator_messages WHERE request_id = $1 ORDER BY id DESC LIMIT 100', [id])).rows;
  res.json({ request, responses, messages, coverage: await requestCoverage(id) });
}

export async function dispatchBloodRequest(req: AuthRequest, res: Response) {
  const id = positiveId(req.params.id);
  const matchedDonors = await transaction(async client => {
    const request = await lockRequest(client, id); ownRequest(req, request);
    if (request.status !== 'Active') throw new HttpError(409, 'Blood request is closed');
    if (request.approval_status !== 'Approved') throw new HttpError(409, 'Super admin approval is required before dispatch');
    const count = await dispatchMatches(client, id);
    await audit(client, req, 'BLOOD_REQUEST_DISPATCHED', 'blood_request', id, { matchedDonors: count });
    return count;
  });
  res.json({ matchedDonors });
}

export async function closeBloodRequest(req: AuthRequest, res: Response) {
  const id = positiveId(req.params.id), status = req.body.status;
  if (!['Fulfilled', 'Cancelled'].includes(status)) throw new HttpError(400, 'Status must be Fulfilled or Cancelled');
  const request = await transaction(async client => {
    const existing = await lockRequest(client, id); ownRequest(req, existing);
    if (existing.status === status) return existing;
    if (existing.status !== 'Active') throw new HttpError(409, 'Blood request is already closed');
    if (status === 'Fulfilled') {
      if (existing.approval_status !== 'Approved') throw new HttpError(409, 'Request has not been approved');
      const units = (await client.query('SELECT COALESCE(SUM(units_donated), 0)::integer AS units FROM donations WHERE request_id = $1', [id])).rows[0].units;
      if (units < existing.required_units) throw new HttpError(409, 'Confirm the required donations before fulfillment');
    }
    const updated = (await client.query('UPDATE blood_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [status, id])).rows[0];
    await client.query('UPDATE notifications SET closed_at = NOW() WHERE request_id = $1 AND closed_at IS NULL', [id]);
    await client.query(`UPDATE push_delivery_jobs j SET status = 'cancelled' FROM notifications n
      WHERE j.notification_id = n.id AND n.request_id = $1 AND j.status IN ('pending', 'processing')`, [id]);
    await audit(client, req, 'BLOOD_REQUEST_CLOSED', 'blood_request', id, { status });
    return updated;
  });
  res.json({ request });
}

export async function confirmDonation(req: AuthRequest, res: Response) {
  const id = positiveId(req.params.id), donorId = positiveId(req.body.donorId);
  if (req.body.unitsDonated !== undefined && req.body.unitsDonated !== 1) throw new HttpError(400, 'Whole-blood confirmation records one unit per donor');
  const donation = await transaction(async client => {
    const request = await lockRequest(client, id); ownRequest(req, request);
    const prior = (await client.query('SELECT * FROM donations WHERE request_id = $1 AND donor_id = $2', [id, donorId])).rows[0];
    if (prior) return prior;
    if (request.status !== 'Active') throw new HttpError(409, 'Blood request is closed');
    if (request.approval_status !== 'Approved') throw new HttpError(409, 'Request has not been approved');
    const donor = await lockDonor(client, donorId);
    // A clinical staff member confirms collection. The server enforces the interval
    // and verified identity/group; staff remains responsible for clinical screening.
    const response = (await client.query(`SELECT id FROM notifications WHERE request_id = $1 AND donor_id = $2
      AND response_status = 'accepted' AND closed_at IS NULL`, [id, donorId])).rows[0];
    if (!response || !donor.blood_group_verified || donor.blood_group !== request.blood_group) throw new HttpError(409, 'An accepted mission and verified matching blood group are required');
    const recent = await client.query(`SELECT id FROM donations WHERE donor_id = $1 AND donation_date + $2::integer > CURRENT_DATE
      UNION ALL SELECT id FROM donor_profiles WHERE user_id = $1 AND (last_donation_date + $2::integer > CURRENT_DATE OR next_eligible_date > CURRENT_DATE)`, [donorId, donationIntervalDays()]);
    if (recent.rowCount) throw new HttpError(409, 'Donation interval has not passed');
    const row = (await client.query(`INSERT INTO donations(donor_id, organization_id, request_id, confirmed_by,is_simulated)
      VALUES ($1,$2,$3,$4,$5) RETURNING *`, [donorId,request.organization_id,id,req.user!.id,request.is_simulated || donor.is_simulated])).rows[0];
    await client.query(`UPDATE donor_profiles SET last_donation_date = CURRENT_DATE,
      next_eligible_date = CURRENT_DATE + $1::integer, updated_at = NOW() WHERE user_id = $2`, [donationIntervalDays(), donorId]);
    await client.query(`UPDATE notifications SET closed_at = NOW() WHERE donor_id = $1 AND response_status = 'accepted' AND closed_at IS NULL`, [donorId]);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`stock:${request.organization_id}:${donor.blood_group}`]);
    await client.query(`INSERT INTO blood_stocks(organization_id, blood_group, available_units, status)
      VALUES ($1, $2, 1, 'Critical') ON CONFLICT (organization_id, blood_group) DO UPDATE SET
      available_units = blood_stocks.available_units + 1,
      status = CASE WHEN blood_stocks.available_units + 1 <= 2 THEN 'Critical' WHEN blood_stocks.available_units + 1 < 10 THEN 'Low' ELSE 'Normal' END,
      updated_at = GREATEST(clock_timestamp(), blood_stocks.updated_at + INTERVAL '1 millisecond')`, [request.organization_id, donor.blood_group]);
    const notification = (await client.query(`INSERT INTO notifications(donor_id, title, message, kind, category, dedupe_key)
      VALUES ($1, 'Donation recorded', 'The institution has confirmed your donation. Your history and donation interval have been updated.', 'community_impact', 'system', $2) RETURNING id`, [donorId, `donation:${row.id}`])).rows[0];
    await queueNotificationPush(client, [notification.id]);
    const units = (await client.query('SELECT SUM(units_donated)::integer AS units FROM donations WHERE request_id = $1', [id])).rows[0].units;
    if (units >= request.required_units) {
      await client.query("UPDATE blood_requests SET status = 'Fulfilled', updated_at = NOW() WHERE id = $1", [id]);
      await client.query('UPDATE notifications SET closed_at = NOW() WHERE request_id = $1 AND closed_at IS NULL', [id]);
      await client.query(`UPDATE push_delivery_jobs j SET status = 'cancelled' FROM notifications n
        WHERE j.notification_id = n.id AND n.request_id = $1 AND j.status IN ('pending', 'processing')`, [id]);
    }
    await audit(client, req, 'DONATION_CONFIRMED', 'donation', row.id, { requestId: id, donorId });
    return row;
  });
  res.json({ donation });
}

export async function institutionOverview(req: AuthRequest, res: Response) {
  const overview = (await pool.query(`SELECT o.id, o.name, o.type, o.district, o.branch_name, o.address, o.contact_phone,
    (SELECT COUNT(*)::integer FROM blood_requests WHERE organization_id = o.id AND status = 'Active' AND approval_status = 'Approved') AS active_requests,
    (SELECT COUNT(*)::integer FROM blood_requests WHERE organization_id = o.id AND status = 'Active' AND approval_status = 'Pending') AS pending_requests,
    (SELECT COALESCE(SUM(available_units), 0)::integer FROM blood_stocks WHERE organization_id = o.id) AS total_units,
    (SELECT COUNT(*)::integer FROM donations WHERE organization_id = o.id) AS donations
    FROM organizations o WHERE o.id = $1`, [req.user!.orgId])).rows[0];
  res.json({ institution: overview });
}

export async function listTeammates(req: AuthRequest, res: Response) {
  const staff = (await pool.query('SELECT id, email, role, status, is_bank_account, must_change_password FROM users WHERE organization_id = $1 ORDER BY id LIMIT 100', [req.user!.orgId])).rows;
  res.json({ staff });
}
async function primaryAccount(client: PoolClient, req: AuthRequest) {
  await activeInstitution(client, req);
  const user = (await client.query('SELECT is_bank_account, role FROM users WHERE id = $1 FOR UPDATE', [req.user!.id])).rows[0];
  if (!user?.is_bank_account || user.role !== 'bloodbank_staff') throw new HttpError(403, 'Only the primary blood bank account can manage teammates');
}
export async function createTeammate(req: AuthRequest, res: Response) {
  const email = emailValue(req.body.email);
  const password = validatePasswordStrength(req.body.password);
  if (!password.valid) throw new HttpError(400, password.errors.join('. '));
  const passwordHash = await hashPassword(req.body.password);
  const user = await transaction(async client => {
    await primaryAccount(client, req);
    const row = (await client.query(`INSERT INTO users(email, password_hash, role, organization_id, must_change_password)
      VALUES ($1, $2, 'bloodbank_staff', $3, true) RETURNING id, email, role, status, must_change_password`, [email, passwordHash, req.user!.orgId])).rows[0];
    await audit(client, req, 'TEAMMATE_CREATED', 'user', row.id);
    return row;
  });
  res.status(201).json({ user });
}
export async function setTeammateStatus(req: AuthRequest, res: Response) {
  const id = positiveId(req.params.id), status = req.body.status;
  if (!['active', 'suspended'].includes(status)) throw new HttpError(400, 'Invalid status');
  const user = await transaction(async client => {
    await primaryAccount(client, req);
    const row = (await client.query(`UPDATE users SET status = $1, updated_at = NOW()
      WHERE id = $2 AND organization_id = $3 AND role = 'bloodbank_staff' AND NOT is_bank_account
      RETURNING id, email, status`, [status, id, req.user!.orgId])).rows[0];
    if (!row) throw new HttpError(404, 'Teammate not found');
    await revokeAllUserTokens(id, client);
    await audit(client, req, 'TEAMMATE_STATUS_UPDATED', 'user', id, { status });
    return row;
  });
  res.json({ user });
}
