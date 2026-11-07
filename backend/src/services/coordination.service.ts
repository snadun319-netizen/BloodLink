import { PoolClient } from 'pg';
import { pool } from '../db';
import { AuthRequest } from '../middleware/auth.middleware';
import { HttpError } from '../transaction';

export function donationIntervalDays(): number {
  const days = Number(process.env.DONATION_INTERVAL_DAYS || 90);
  if (!Number.isInteger(days) || days < 1 || days > 730) throw new Error('Invalid DONATION_INTERVAL_DAYS');
  return days;
}

export function distanceSQL(a: string, b: string): string {
  // Aliases are internal constants, never user input. Clamp floating point roundoff.
  return `(6371 * acos(LEAST(1.0, GREATEST(-1.0,
    sin(radians(${a}.latitude::double precision)) * sin(radians(${b}.latitude::double precision)) +
    cos(radians(${a}.latitude::double precision)) * cos(radians(${b}.latitude::double precision)) *
    cos(radians((${a}.longitude - ${b}.longitude)::double precision))))))`;
}

export const requestOpenSQL = `r.status = 'Active' AND r.approval_status = 'Approved'
  AND (r.expires_at IS NULL OR r.expires_at > NOW()) AND r.created_at <= NOW()`;

export const donorEligibilitySQL = `dp.blood_group_verified AND dp.is_available
  AND dp.consent_status = 'granted' AND dp.consent_recorded_at IS NOT NULL AND dp.consent_recorded_at <= NOW()
  AND dp.availability_updated_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
  AND dp.latitude IS NOT NULL AND dp.longitude IS NOT NULL
  AND COALESCE(dp.next_eligible_date, CURRENT_DATE) <= CURRENT_DATE
  AND (dp.last_donation_date IS NULL OR dp.last_donation_date + $2::integer <= CURRENT_DATE)
  AND NOT EXISTS (SELECT 1 FROM donations d WHERE d.donor_id = dp.user_id AND d.donation_date + $2::integer > CURRENT_DATE)
  AND NOT EXISTS (SELECT 1 FROM notifications busy JOIN blood_requests other ON other.id=busy.request_id
    JOIN organizations site ON site.id=other.organization_id
    WHERE busy.donor_id=dp.user_id AND busy.request_id<>r.id AND busy.response_status='accepted' AND busy.closed_at IS NULL
      AND other.status='Active' AND other.approval_status='Approved' AND (other.expires_at IS NULL OR other.expires_at>NOW())
      AND site.is_active AND site.verification_status='approved')`;

export async function matchedRequests(donorId: string, limit = 100) {
  return (await pool.query(`SELECT r.*, o.name AS hospital_name, o.address, o.contact_phone,
    o.branch_name, o.district, ${distanceSQL('dp', 'o')} AS distance_km,
    n.response_status, n.responded_at, n.closed_at,
    (SELECT COUNT(*)::integer FROM notifications a WHERE a.request_id = r.id AND a.response_status = 'accepted' AND a.closed_at IS NULL) AS accepted_donors
    FROM blood_requests r JOIN organizations o ON o.id = r.organization_id
    JOIN donor_profiles dp ON dp.user_id = $1 JOIN users u ON u.id = dp.user_id
    LEFT JOIN notifications n ON n.request_id = r.id AND n.donor_id = dp.user_id
    WHERE ${requestOpenSQL} AND o.is_active AND o.verification_status = 'approved'
      AND u.status = 'active' AND u.role = 'donor' AND ${donorEligibilitySQL}
      AND dp.blood_group = r.blood_group
      AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
      AND ${distanceSQL('dp', 'o')} <= r.radius_km
    ORDER BY CASE r.priority WHEN 'Emergency' THEN 0 WHEN 'Urgent' THEN 1 ELSE 2 END,
      r.created_at DESC, r.id DESC LIMIT $3`, [donorId, donationIntervalDays(), limit])).rows;
}

export async function lockRequest(client: PoolClient, requestId: number) {
  const row = (await client.query('SELECT * FROM blood_requests WHERE id = $1 FOR UPDATE', [requestId])).rows[0];
  if (!row) throw new HttpError(404, 'Blood request not found');
  if (row.status === 'Active' && row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    throw new HttpError(409, 'Blood request has expired');
  }
  if (new Date(row.created_at).getTime() > Date.now()) throw new HttpError(409, 'Blood request has not opened yet');
  const organization = (await client.query('SELECT * FROM organizations WHERE id = $1 FOR SHARE', [row.organization_id])).rows[0];
  if (!organization?.is_active || organization.verification_status !== 'approved') throw new HttpError(409, 'Institution is not active and approved');
  return { ...row, hospital_name: organization.name };
}

export async function lockDonor(client: PoolClient, donorId: string | number) {
  const user = (await client.query('SELECT role, status FROM users WHERE id = $1 FOR UPDATE', [donorId])).rows[0];
  if (!user || user.role !== 'donor' || user.status !== 'active') throw new HttpError(403, 'An active donor is required');
  const donor = (await client.query('SELECT * FROM donor_profiles WHERE user_id = $1 FOR UPDATE', [donorId])).rows[0];
  if (!donor) throw new HttpError(404, 'Donor profile not found');
  return donor;
}

export async function assertRequestMatch(client: PoolClient, donorId: string, requestId: number) {
  const result = await client.query(`SELECT dp.user_id FROM donor_profiles dp
    JOIN blood_requests r ON r.id = $1 JOIN organizations o ON o.id = r.organization_id
    WHERE dp.user_id = $3 AND ${requestOpenSQL}
      AND o.is_active AND o.verification_status = 'approved'
      AND ${donorEligibilitySQL} AND dp.blood_group = r.blood_group
      AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
      AND ${distanceSQL('dp', 'o')} <= r.radius_km`, [requestId, donationIntervalDays(), donorId]);
  if (!result.rowCount) throw new HttpError(409, 'A verified, available donor with a matching blood group, location and donation interval is required');
}

export async function audit(client: PoolClient, req: AuthRequest, action: string, targetType: string, targetId: string | number, metadata: object = {}) {
  await client.query(`INSERT INTO audit_logs(actor_user_id, action, target_type, target_id, metadata, ip_address)
    VALUES ($1, $2, $3, $4, $5, $6)`, [req.user!.id, action, targetType, targetId, JSON.stringify(metadata), req.ip || null]);
}

export async function queueNotificationPush(client: PoolClient, notificationIds: number[]) {
  if (!notificationIds.length) return;
  await client.query(`INSERT INTO push_delivery_jobs(notification_id, device_id)
    SELECT n.id, d.id FROM notifications n JOIN push_devices d ON d.user_id = n.donor_id
    LEFT JOIN donor_profiles dp ON dp.user_id=n.donor_id LEFT JOIN blood_requests r ON r.id=n.request_id
    WHERE n.id = ANY($1::integer[]) AND NOT COALESCE(dp.is_simulated,false) AND NOT COALESCE(r.is_simulated,false)
    ON CONFLICT DO NOTHING`, [notificationIds]);
}

export async function dispatchMatches(client: PoolClient, requestId: number) {
  const matches = await client.query(`INSERT INTO notifications(request_id, donor_id, title, message)
    SELECT r.id, dp.user_id, 'Blood donation request', 'A verified institution has requested your blood group nearby. Open BloodLink for details.'
    FROM blood_requests r JOIN organizations o ON o.id = r.organization_id
    JOIN donor_profiles dp ON dp.blood_group = r.blood_group JOIN users u ON u.id = dp.user_id
    WHERE r.id = $1 AND ${requestOpenSQL} AND o.is_active AND o.verification_status = 'approved'
      AND u.role = 'donor' AND u.status = 'active' AND ${donorEligibilitySQL}
      AND o.latitude IS NOT NULL AND o.longitude IS NOT NULL
      AND ${distanceSQL('dp', 'o')} <= r.radius_km
    ON CONFLICT (request_id, donor_id) DO UPDATE SET closed_at = NULL, sent_at = NOW(), read_at = NULL
      WHERE notifications.closed_at IS NOT NULL AND notifications.response_status = 'pending' RETURNING id`, [requestId, donationIntervalDays()]);
  await queueNotificationPush(client, matches.rows.map(row => row.id));
  return matches.rowCount || 0;
}

/** Aggregate only: no donor identities or coordinates leave this query. */
export async function requestCoverage(requestId: number) {
  const request = (await pool.query('SELECT * FROM blood_requests WHERE id=$1', [requestId])).rows[0];
  if (!request) throw new HttpError(404, 'Blood request not found');
  const bands = (await pool.query(`SELECT band.radius_km,
    COUNT(dp.user_id) FILTER (WHERE ${requestOpenSQL} AND o.is_active AND o.verification_status='approved'
      AND ${donorEligibilitySQL} AND ${distanceSQL('dp','o')} <= band.radius_km
      AND NOT EXISTS(SELECT 1 FROM notifications declined WHERE declined.request_id=r.id
        AND declined.donor_id=dp.user_id AND declined.response_status='declined'))::integer AS candidates,
    COUNT(dp.user_id) FILTER (WHERE dp.is_available AND (dp.availability_updated_at IS NULL
      OR dp.availability_updated_at < NOW()-INTERVAL '30 days' OR dp.availability_updated_at>NOW())
      AND ${distanceSQL('dp','o')}<=band.radius_km)::integer AS stale_profiles
    FROM blood_requests r JOIN organizations o ON o.id=r.organization_id
    CROSS JOIN (VALUES(10),(25),(50)) band(radius_km)
    LEFT JOIN (donor_profiles dp JOIN users u ON u.id=dp.user_id AND u.status='active' AND u.role='donor') ON dp.blood_group=r.blood_group
    WHERE r.id=$1 GROUP BY band.radius_km ORDER BY band.radius_km`, [requestId, donationIntervalDays()])).rows;
  const responses = (await pool.query(`SELECT count(*)::integer AS notified,
    count(*) FILTER(WHERE response_status='accepted' AND closed_at IS NULL)::integer AS accepted,
    count(*) FILTER(WHERE response_status='declined')::integer AS declined,
    count(*) FILTER(WHERE response_status='pending')::integer AS unanswered FROM notifications WHERE request_id=$1`, [requestId])).rows[0];
  return { outreachTarget: request.outreach_target, isSimulated: request.is_simulated,
    asOf: new Date().toISOString(), freshnessDays: 30,
    bands: bands.map(b => ({ radiusKm: b.radius_km, candidates: b.candidates, staleProfiles: b.stale_profiles,
      gap: request.outreach_target == null ? null : Math.max(0,request.outreach_target-b.candidates) })),
    responses, note: 'Potential volunteers, not confirmed donations or blood units. Staff determine donation eligibility.' };
}
