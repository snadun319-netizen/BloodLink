import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { positiveId, text } from '../middleware/validation.middleware';
import { pool } from '../db';
import { transaction, HttpError } from '../transaction';
import { matchedRequests, lockDonor, lockRequest, assertRequestMatch, audit, donationIntervalDays } from '../services/coordination.service';

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.length ? (words[0][0] + (words.length > 1 ? words.at(-1)![0] : '')).toUpperCase() : 'D';
}
const groupLabel = (group: string) => `${group} ${group.endsWith('-') ? 'Negative' : 'Positive'}`;
const distanceLabel = (distance: unknown) => distance == null ? 'Location unavailable' : `${Number(distance).toFixed(1)} km away`;
function timeAgo(value: Date): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes / 60)}h ago` : `${Math.floor(minutes / 1440)}d ago`;
}

export async function getRequestsPageData(req: AuthRequest, res: Response) {
  const donorId = req.user!.id;
  const donor = (await pool.query(`SELECT dp.*,
    COALESCE(dp.next_eligible_date,CURRENT_DATE)<=CURRENT_DATE
      AND (dp.last_donation_date IS NULL OR dp.last_donation_date+$2::integer<=CURRENT_DATE)
      AND NOT EXISTS(SELECT 1 FROM donations d WHERE d.donor_id=dp.user_id AND d.donation_date+$2::integer>CURRENT_DATE) AS interval_passed
    FROM donor_profiles dp WHERE dp.user_id=$1`, [donorId,donationIntervalDays()])).rows[0];
  if (!donor) throw new HttpError(404, 'Donor profile not found');
  const candidates = await matchedRequests(donorId);
  const mission = (await pool.query(`SELECT n.request_id, n.responded_at, r.blood_group, r.required_units,
    o.name, o.branch_name, o.contact_phone FROM notifications n
    JOIN blood_requests r ON r.id = n.request_id JOIN organizations o ON o.id = r.organization_id
    WHERE n.donor_id = $1 AND n.response_status = 'accepted' AND n.closed_at IS NULL
      AND r.status = 'Active' AND (r.expires_at IS NULL OR r.expires_at>NOW()) AND r.approval_status = 'Approved' AND o.is_active AND o.verification_status = 'approved' LIMIT 1`, [donorId])).rows[0];
  const alerts = candidates.filter(row => !['accepted', 'declined'].includes(row.response_status)).map(row => ({
    id: String(row.id), hospitalName: row.hospital_name, distance: distanceLabel(row.distance_km),
    timeAgo: timeAgo(row.created_at), bloodGroup: groupLabel(row.blood_group), unitsNeeded: row.required_units,
    isUrgent: row.priority !== 'Normal', type: row.priority === 'Normal' ? 'standard' : 'urgent',
    requirementLabel: `${groupLabel(row.blood_group)} · ${row.required_units} units needed`,
    address: row.address || 'Address unavailable', contactNumber: row.contact_phone || '',
    patientCase: 'Institution blood donation request', department: row.department || row.branch_name,
    verifiedInstitution: true, acceptedDonors: row.accepted_donors, priority: row.priority,
  }));
  const unread = (await pool.query(`SELECT COUNT(*)::integer AS count FROM notifications n
    LEFT JOIN blood_requests r ON r.id = n.request_id WHERE n.donor_id = $1 AND n.read_at IS NULL
    AND (n.request_id IS NULL OR r.approval_status = 'Approved')`, [donorId])).rows[0].count;
  let emptyState: { title:string;message:string;action?:'profile'|'active' } | null = null;
  if (!alerts.length) {
    if (mission) emptyState={title:'You have an active request',message:'Open the Active tab to view your accepted request. You can have one active request at a time.',action:'active'};
    else if (!donor.blood_group_verified) emptyState={title:'Verify your blood group',message:'Submit a blood-group document in Profile. Requests appear after verification and when your other matching details are complete.',action:'profile'};
    else if (donor.consent_status!=='granted' || !donor.consent_recorded_at) emptyState={title:'Enable request alerts in Profile',message:'Turn on availability in Profile to consent to matched request alerts. Existing notifications are separate from available blood requests.',action:'profile'};
    else if (!donor.is_available) emptyState={title:'Request alerts are paused',message:'Turn on availability in Profile when you want to receive matched requests.',action:'profile'};
    else if (!donor.availability_updated_at || new Date(donor.availability_updated_at).getTime()<Date.now()-30*86400000 || new Date(donor.availability_updated_at).getTime()>Date.now()) emptyState={title:'Renew your availability',message:'Update your availability in Profile. Matching uses availability confirmed within the last 30 days.',action:'profile'};
    else if (donor.latitude==null || donor.longitude==null) emptyState={title:'Set your matching location',message:'Add a matching location in Profile so nearby requests can be shown.',action:'profile'};
    else if (!donor.interval_passed) emptyState={title:'Recorded donation interval has not passed',message:'See your recorded interval in Profile. Blood-bank staff assess whether you can donate.',action:'profile'};
    else emptyState={title:'No matching requests right now',message:'Only open, approved requests matching your current profile appear here. Pull down to refresh.'};
  }
  res.json({ donorInitials: initials(donor.full_name || ''), donorName: donor.full_name || 'Donor',
    // Legacy field remains compatible, but request badges always count actionable cards.
    unreadAlertsCount: alerts.length, availableAlertsCount: alerts.length, unreadNotificationsCount: unread,
    activeCount: mission ? 1 : 0, alerts, emptyState,
    activeMission: mission ? {
      id: String(mission.request_id), hospitalName: mission.name, unitDepartment: mission.branch_name || '',
      bloodGroup: groupLabel(mission.blood_group), unitsNeeded: mission.required_units,
      estimatedArrival: 'Contact the institution', status: 'En Route', coordinatorName: 'Donation coordinator',
      coordinatorPhone: mission.contact_phone || '',
      // Display reference only; it never authorizes donation confirmation.
      fastPassToken: `#BL-${mission.request_id}`,
      steps: [
        { id: 'step-1', title: 'Accepted Request', time: new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(mission.responded_at)), status: 'completed' },
        { id: 'step-2', title: 'En Route to Hospital', status: 'in_progress', badgeText: 'In Progress' },
        { id: 'step-3', title: 'Arrive & Donate', status: 'upcoming', badgeText: 'Upcoming' },
      ],
    } : null,
  });
}

export async function respondToAlert(req: AuthRequest, res: Response) {
  const requestId = positiveId(req.params.id), donorId = req.user!.id;
  const input = req.body.status;
  if (!['accepted', 'en_route', 'declined'].includes(input)) throw new HttpError(400, 'Status must be accepted, en_route or declined');
  const status = input === 'en_route' ? 'accepted' : input;
  await transaction(async client => {
    const request = await lockRequest(client, requestId);
    if (request.status !== 'Active') throw new HttpError(409, 'Blood request is closed');
    if (request.approval_status !== 'Approved') throw new HttpError(409, 'Blood request is awaiting approval or has been rejected');
    await lockDonor(client, donorId);
    const existing = (await client.query('SELECT * FROM notifications WHERE request_id = $1 AND donor_id = $2', [requestId, donorId])).rows[0];
    if (existing?.closed_at) throw new HttpError(409, 'This mission is already closed');
    if (status === 'accepted') {
      await assertRequestMatch(client, donorId, requestId);
      // Hidden missions must not strand a donor after their institution loses access.
      // The donor lock also serializes concurrent acceptance of different requests.
      await client.query(`UPDATE notifications n SET closed_at = NOW()
        FROM blood_requests r JOIN organizations o ON o.id = r.organization_id
        WHERE n.request_id = r.id AND n.donor_id = $1 AND n.request_id <> $2
          AND n.response_status = 'accepted' AND n.closed_at IS NULL
          AND (r.status <> 'Active' OR r.approval_status <> 'Approved' OR r.expires_at<=NOW()
            OR NOT o.is_active OR o.verification_status <> 'approved')`, [donorId, requestId]);
      if ((await client.query(`SELECT id FROM notifications WHERE donor_id = $1 AND request_id <> $2
        AND response_status = 'accepted' AND closed_at IS NULL`, [donorId, requestId])).rowCount) throw new HttpError(409, 'You already have an active mission');
    } else if (!existing) await assertRequestMatch(client, donorId, requestId);
    await client.query(`INSERT INTO notifications(request_id, donor_id, title, message, response_status, responded_at, read_at)
      VALUES ($1, $2, 'Blood donation request', 'Donor response recorded', $3, NOW(), NOW())
      ON CONFLICT (request_id, donor_id) DO UPDATE SET response_status = $3, responded_at = NOW(), read_at = NOW()`, [requestId, donorId, status]);
    await audit(client, req, 'DONOR_REQUEST_RESPOND', 'blood_request', requestId, { responseStatus: status });
  });
  res.json({ success: true, message: status === 'accepted' ? 'The institution can now see your response.' : 'Request declined.', requestId: String(requestId), status });
}

export async function notifyCoordinator(req: AuthRequest, res: Response) {
  const requestId = positiveId(req.params.id), reason = text(req.body.reason, 'reason', 2000);
  await transaction(async client => {
    const request = await lockRequest(client, requestId);
    if (request.status !== 'Active') throw new HttpError(409, 'Blood request is closed');
    await lockDonor(client, req.user!.id);
    const response = await client.query(`SELECT id FROM notifications WHERE request_id = $1 AND donor_id = $2
      AND response_status = 'accepted' AND closed_at IS NULL`, [requestId, req.user!.id]);
    if (!response.rowCount) throw new HttpError(404, 'Active mission not found');
    const recent = await client.query(`SELECT id FROM coordinator_messages WHERE request_id = $1 AND donor_id = $2
      AND created_at > NOW() - INTERVAL '30 seconds'`, [requestId, req.user!.id]);
    if (recent.rowCount) throw new HttpError(429, 'Wait before sending another update');
    await client.query('INSERT INTO coordinator_messages(request_id, donor_id, message) VALUES ($1, $2, $3)', [requestId, req.user!.id, reason]);
    await audit(client, req, 'DONOR_COORDINATOR_NOTIFIED', 'blood_request', requestId);
  });
  res.json({ success: true, message: 'Your update is available to the institution coordinator.', missionId: String(requestId) });
}

export async function cancelMission(req: AuthRequest, res: Response) {
  const requestId = positiveId(req.params.id);
  await transaction(async client => {
    const request = await lockRequest(client, requestId);
    if (request.status !== 'Active') throw new HttpError(409, 'Blood request is closed');
    await lockDonor(client, req.user!.id);
    const changed = await client.query(`UPDATE notifications SET response_status = 'declined', responded_at = NOW(), read_at = NOW()
      WHERE request_id = $1 AND donor_id = $2 AND response_status = 'accepted' AND closed_at IS NULL RETURNING id`, [requestId, req.user!.id]);
    if (!changed.rowCount) throw new HttpError(404, 'Active mission not found');
    await audit(client, req, 'DONOR_MISSION_CANCELLED', 'blood_request', requestId);
  });
  res.json({ success: true, message: 'Active mission cancelled.' });
}
