import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { pool } from '../db';
import { HttpError, transaction } from '../transaction';
import { DISTRICTS, text, phoneValue } from '../middleware/validation.middleware';
import { matchedRequests, donationIntervalDays, lockDonor, audit } from '../services/coordination.service';
import { initials } from './requests.controller';

export async function profileData(donorId: string) {
  const row = (await pool.query(`SELECT dp.*, u.created_at AS donor_since,
    (SELECT COUNT(*)::integer FROM donations d WHERE d.donor_id = u.id) AS total_donations,
    (SELECT o.name FROM donations d JOIN organizations o ON o.id = d.organization_id
      WHERE d.donor_id = u.id ORDER BY donation_date DESC, d.id DESC LIMIT 1) AS last_place,
    v.id AS verification_id, v.status AS verification_status, v.document_url, v.rejection_reason,
    v.created_at AS uploaded_at, v.reviewed_at,
    doc.id AS document_id, doc.file_name, octet_length(doc.content) AS size_bytes,
    GREATEST(COALESCE(dp.next_eligible_date, CURRENT_DATE),
      COALESCE(dp.last_donation_date + $2::integer, CURRENT_DATE),
      COALESCE((SELECT MAX(donation_date) + $2::integer FROM donations d WHERE d.donor_id = u.id), CURRENT_DATE)) AS effective_next_date
    FROM donor_profiles dp JOIN users u ON u.id = dp.user_id
    LEFT JOIN LATERAL (SELECT * FROM donor_verifications WHERE donor_id = u.id ORDER BY id DESC LIMIT 1) v ON true
    LEFT JOIN verification_documents doc ON v.document_url = '/api/documents/' || doc.id::text AND doc.owner_id = u.id
    WHERE u.id = $1`, [donorId, donationIntervalDays()])).rows[0];
  if (!row) throw new HttpError(404, 'Donor profile not found');
  return {
    id: String(row.user_id), fullName: row.full_name || '', phone: row.phone || '', district: row.district || '',
    hasMatchingLocation: row.latitude != null && row.longitude != null,
    donorSince: row.donor_since, bloodGroup: row.blood_group, isAvailable: row.is_available && row.consent_status==='granted'
      && row.consent_recorded_at && new Date(row.consent_recorded_at).getTime()<=Date.now()
      && row.availability_updated_at && new Date(row.availability_updated_at).getTime()<=Date.now()
      && new Date(row.availability_updated_at).getTime()>=Date.now()-30*86400000 ? true:false,
    totalDonations: row.total_donations, lastDonationDate: row.last_donation_date, lastDonationPlace: row.last_place,
    nextEligibleDate: row.effective_next_date,
    bloodGroupVerified: row.blood_group_verified, isSimulated: row.is_simulated,
    outreachConsent: row.consent_status, availabilityUpdatedAt: row.availability_updated_at,
    bloodGroupVerification: row.blood_group_verified ? 'approved' : row.verification_status || 'none',
    verifiedBy: row.blood_group_verified ? row.is_simulated ? 'Simulated verification' : 'BloodLink administrator' : undefined,
    verifiedAt: row.blood_group_verified ? row.reviewed_at : undefined,
    nicNumber: row.nic || '', nicVerified: false,
    document: row.verification_id ? {
      id: String(row.verification_id), fileName: row.file_name || 'Verification document',
      sizeBytes: row.size_bytes || 0, status: row.verification_status,
      rejectionReason: row.rejection_reason || undefined, uploadedAt: row.uploaded_at,
      downloadPath: row.document_id ? `/api/documents/${row.document_id}` : null,
    } : null,
  };
}

export async function getMyProfile(req: AuthRequest, res: Response) { res.json(await profileData(req.user!.id)); }

export async function updateMyProfile(req: AuthRequest, res: Response) {
  const allowed = ['fullName', 'phone', 'district', 'latitude', 'longitude'];
  if (!Object.keys(req.body).length || Object.keys(req.body).some(key => !allowed.includes(key))) throw new HttpError(400, 'Only name, phone, district and location can be edited');
  const fields: Record<string, unknown> = {};
  if ('fullName' in req.body) fields.full_name = text(req.body.fullName, 'full name');
  if ('phone' in req.body) fields.phone = phoneValue(req.body.phone);
  if ('district' in req.body) {
    if (!DISTRICTS.includes(req.body.district)) throw new HttpError(400, 'Invalid district');
    fields.district = req.body.district;
  }
  if ('latitude' in req.body || 'longitude' in req.body) {
    for (const [key, max] of [['latitude', 90], ['longitude', 180]] as const) {
      const value = req.body[key];
      if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > max)) throw new HttpError(400, 'Provide both valid coordinates, or null to clear both');
      fields[key] = value;
    }
    if ((fields.latitude === null) !== (fields.longitude === null)) throw new HttpError(400, 'Provide both coordinates');
  }
  await transaction(async client => {
    await lockDonor(client, req.user!.id);
    const keys = Object.keys(fields);
    await client.query(`UPDATE donor_profiles SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}, updated_at = NOW() WHERE user_id = $${keys.length + 1}`, [...Object.values(fields), req.user!.id]);
    await audit(client, req, 'DONOR_PROFILE_UPDATED', 'user', req.user!.id, { fields: Object.keys(req.body) });
  });
  res.json(await profileData(req.user!.id));
}

export async function setAvailability(req: AuthRequest, res: Response) {
  if (typeof req.body.isAvailable !== 'boolean' || Object.keys(req.body).some(key => key !== 'isAvailable')) throw new HttpError(400, 'isAvailable must be a boolean');
  await transaction(async client => {
    await lockDonor(client, req.user!.id);
    await client.query(`UPDATE donor_profiles SET is_available=$1,availability_updated_at=NOW(),
      consent_status=CASE WHEN $1 THEN 'granted' ELSE 'withdrawn' END,consent_recorded_at=NOW(),updated_at=NOW()
      WHERE user_id=$2`, [req.body.isAvailable, req.user!.id]);
    await audit(client, req, 'DONOR_AVAILABILITY_UPDATED', 'user', req.user!.id, { isAvailable: req.body.isAvailable });
  });
  res.json(await profileData(req.user!.id));
}

export async function getNearbyBloodRequests(req: AuthRequest, res: Response) {
  const rows = await matchedRequests(req.user!.id);
  res.json({ requests: rows.filter(row => row.response_status !== 'declined').map(requestCard) });
}

function requestCard(row: any) {
  return { id: String(row.id), hospitalName: row.hospital_name, bloodGroup: row.blood_group,
    priority: row.priority === 'Emergency' ? 'Emergency' : row.priority === 'Urgent' ? 'Critical' : 'Urgent',
    distance: `${Number(row.distance_km).toFixed(1)} km`, status: row.response_status === 'accepted' ? 'en_route' : 'available',
    requiredUnits: row.required_units, createdAt: row.created_at };
}

export async function getDonorHomeDashboard(req: AuthRequest, res: Response) {
  const profile = await profileData(req.user!.id), rows = await matchedRequests(req.user!.id);
  const requests = rows.filter(row => row.response_status !== 'declined');
  const emergency = requests.find(row => row.priority === 'Emergency');
  const stats = (await pool.query(`SELECT COALESCE(SUM(units_donated), 0)::integer AS units,
    COALESCE(SUM(units_donated) FILTER (WHERE donation_date >= date_trunc('month', CURRENT_DATE)), 0)::integer AS monthly
    FROM donations WHERE donor_id = $1`, [req.user!.id])).rows[0];
  const unread = (await pool.query(`SELECT COUNT(*)::integer AS count FROM notifications n
    LEFT JOIN blood_requests r ON r.id = n.request_id WHERE n.donor_id = $1 AND n.read_at IS NULL
    AND (n.request_id IS NULL OR r.approval_status = 'Approved')`, [req.user!.id])).rows[0].count;
  const intervalPassed = String(profile.nextEligibleDate).slice(0, 10) <= new Date().toISOString().slice(0, 10);
  res.json({ donor: {
    name: profile.fullName || 'Donor', initials: initials(profile.fullName), bloodGroup: profile.bloodGroup,
    rhGroup: profile.bloodGroup || 'Unknown', isVerified: profile.bloodGroupVerified, authorityVerified: profile.bloodGroupVerified,
    lastDonationDate: profile.lastDonationDate || 'No donations yet',
    nextEligibleStatus: intervalPassed ? 'Donation interval passed' : profile.nextEligibleDate,
    qualificationInterval: `${donationIntervalDays()}-day donation interval`,
    isEligible: intervalPassed && profile.bloodGroupVerified && profile.isAvailable,
    totalDonations: stats.units, monthlyGain: stats.monthly,
    urgentRequestsCount: requests.filter(row => row.priority !== 'Normal').length, matchedRequestsCount: requests.length,
    availableAlertsCount:requests.filter(row=>row.response_status!=='accepted').length,unreadNotificationsCount: unread,
  }, emergencyMatch: emergency ? {
    requestId: String(emergency.id), hospitalName: emergency.hospital_name, bloodGroup: emergency.blood_group,
    distance: `${Number(emergency.distance_km).toFixed(1)} km away`, details: `${emergency.required_units} units requested`,
    requiredUnits: emergency.required_units, status: emergency.response_status === 'accepted' ? 'en_route' : 'available',
  } : null, requests: requests.slice(0, 10).map(requestCard) });
}

export async function donationHistory(donorId: string) {
  const profile = (await pool.query('SELECT full_name, blood_group FROM donor_profiles WHERE user_id = $1', [donorId])).rows[0];
  if (!profile) throw new HttpError(404, 'Donor profile not found');
  const rows = (await pool.query(`SELECT d.id, d.units_donated, d.donation_date, o.name AS hospital_name
    FROM donations d JOIN organizations o ON o.id = d.organization_id WHERE d.donor_id = $1
    ORDER BY d.donation_date DESC, d.id DESC LIMIT 1000`, [donorId])).rows;
  const total = rows.reduce((sum, row) => sum + row.units_donated, 0);
  return { donorName: profile.full_name || 'Donor', summary: { bloodGroup: profile.blood_group, totalDonations: rows.length, totalVolumeMl: total * 450 },
    records: rows.map(row => ({ id: `don-${row.id}`, hospitalName: row.hospital_name, donatedAt: row.donation_date,
      donationType: 'Whole Blood', volumeMl: row.units_donated * 450, status: 'verified' })) };
}
export async function getMyDonations(req: AuthRequest, res: Response) { res.json(await donationHistory(req.user!.id)); }
