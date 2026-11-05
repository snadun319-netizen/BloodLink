import { GoogleAuth } from 'google-auth-library';
import { pool } from '../db';
import { transaction } from '../transaction';
import { queueNotificationPush, donationIntervalDays, donorEligibilitySQL, requestOpenSQL, distanceSQL } from './coordination.service';

let auth: GoogleAuth | undefined;
export function assertPushConfigured() {
  const transport = process.env.PUSH_TRANSPORT || 'disabled';
  if (!['disabled', 'fcm'].includes(transport)) throw new Error('PUSH_TRANSPORT must be disabled or fcm');
  if (transport === 'fcm' && !/^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(process.env.FCM_PROJECT_ID || '')) throw new Error('Configure FCM_PROJECT_ID for push delivery');
}

async function sendFCM(token: string, notificationId: number): Promise<void> {
  auth ||= new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/firebase.messaging'] });
  const accessToken = await auth.getAccessToken();
  if (!accessToken) throw new Error('Firebase credentials unavailable');
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`, {
    method: 'POST', signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    // Lock-screen notifications contain no health, identity or location details.
    body: JSON.stringify({ message: { token,
      notification: { title: 'BloodLink', body: 'You have a new BloodLink notification. Open the app to view it.' },
      data: { notificationId: String(notificationId) },
    } }),
  });
  if (response.ok) return;
  const body = await response.json().catch(() => null) as any;
  const unregistered = body?.error?.details?.some((detail: any) => detail.errorCode === 'UNREGISTERED');
  const error = new Error('Push delivery failed') as Error & { invalidDevice?: boolean };
  error.invalidDevice = !!unregistered;
  throw error;
}

export async function processPushJobs(send: (token: string, notificationId: number) => Promise<void> = sendFCM) {
  if (process.env.PUSH_TRANSPORT !== 'fcm') return;
  await pool.query(`UPDATE push_delivery_jobs SET status = 'failed', lease_until = NULL
    WHERE attempts >= 5 AND (status = 'pending' OR (status = 'processing' AND lease_until < NOW()))`);
  const job = (await pool.query(`WITH candidate AS (
    SELECT id FROM push_delivery_jobs WHERE attempts < 5 AND ((status = 'pending' AND next_attempt_at <= NOW())
      OR (status = 'processing' AND lease_until < NOW())) ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED)
    UPDATE push_delivery_jobs j SET status = 'processing', attempts = attempts + 1, lease_until = NOW() + INTERVAL '2 minutes'
    FROM candidate c WHERE j.id = c.id RETURNING j.*`)).rows[0];
  if (!job) return;
  const target = (await pool.query(`SELECT d.token, d.user_id, n.request_id FROM push_devices d
    JOIN notifications n ON n.id = $2 JOIN users u ON u.id = d.user_id
    LEFT JOIN blood_requests r ON r.id = n.request_id LEFT JOIN organizations o ON o.id = r.organization_id
    LEFT JOIN donor_profiles dp ON dp.user_id=n.donor_id
    WHERE d.id = $1 AND n.donor_id = d.user_id AND u.status = 'active' AND n.closed_at IS NULL
      AND NOT COALESCE(dp.is_simulated,false) AND NOT COALESCE(r.is_simulated,false)
      AND (n.request_id IS NULL OR (${requestOpenSQL} AND u.role='donor' AND o.is_active AND o.verification_status='approved'
        AND ${donorEligibilitySQL.replaceAll('$2::integer','$3::integer')} AND dp.blood_group=r.blood_group
        AND ${distanceSQL('dp','o')}<=r.radius_km AND n.response_status='pending'))
      AND EXISTS(SELECT 1 FROM refresh_tokens t WHERE t.user_id = d.user_id AND t.family_id = d.family_id AND NOT t.is_revoked AND t.expires_at > NOW())`, [job.device_id, job.notification_id,donationIntervalDays()])).rows[0];
  if (!target) {
    await pool.query("UPDATE push_delivery_jobs SET status = 'cancelled', lease_until = NULL WHERE id = $1 AND status = 'processing' AND attempts = $2", [job.id, job.attempts]);
    return;
  }
  try {
    await send(target.token, job.notification_id);
    await pool.query("UPDATE push_delivery_jobs SET status = 'sent', lease_until = NULL WHERE id = $1 AND status = 'processing' AND attempts = $2", [job.id, job.attempts]);
  } catch (error) {
    if ((error as any).invalidDevice) {
      await pool.query('DELETE FROM push_devices WHERE id = $1', [job.device_id]);
      return;
    }
    await pool.query(`UPDATE push_delivery_jobs SET status = $1, lease_until = NULL,
      next_attempt_at = NOW() + ($2::integer * INTERVAL '1 minute')
      WHERE id = $3 AND status = 'processing' AND attempts = $4`, [job.attempts >= 5 ? 'failed' : 'pending', Math.min(60, 2 ** job.attempts), job.id, job.attempts]);
    console.error('Push delivery deferred or failed');
  }
}

export async function createEligibilityReminders() {
  await transaction(async client => {
    const expired = await client.query(`UPDATE blood_requests SET status='Cancelled',updated_at=NOW(),
      review_reason=COALESCE(review_reason,'Response window expired') WHERE status='Active' AND expires_at<=NOW() RETURNING id`);
    if (expired.rowCount) {
      await client.query('UPDATE notifications SET closed_at=NOW() WHERE request_id=ANY($1::integer[]) AND closed_at IS NULL',[expired.rows.map(r=>r.id)]);
      await client.query(`UPDATE push_delivery_jobs j SET status='cancelled',lease_until=NULL FROM notifications n
        WHERE j.notification_id=n.id AND n.request_id=ANY($1::integer[]) AND j.status IN ('pending','processing')`,[expired.rows.map(r=>r.id)]);
    }
    const result = await client.query(`INSERT INTO notifications(donor_id, title, message, kind, category, dedupe_key)
      SELECT dp.user_id, 'Donation interval reminder', 'Your recorded donation interval has passed. Staff will assess eligibility before a donation.',
        'health_advisory', 'system', 'interval:' || dp.user_id::text || ':' || dp.next_eligible_date::text
      FROM donor_profiles dp JOIN users u ON u.id = dp.user_id
      WHERE u.role = 'donor' AND u.status = 'active' AND dp.blood_group_verified AND dp.is_available
        AND dp.consent_status='granted' AND dp.consent_recorded_at<=NOW()
        AND dp.availability_updated_at BETWEEN NOW()-INTERVAL '30 days' AND NOW()
        AND dp.next_eligible_date <= CURRENT_DATE AND dp.last_donation_date + $1::integer <= CURRENT_DATE
        AND NOT EXISTS (SELECT 1 FROM donations d WHERE d.donor_id = dp.user_id AND d.donation_date + $1::integer > CURRENT_DATE)
      ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`, [donationIntervalDays()]);
    await queueNotificationPush(client, result.rows.map(row => row.id));
  });
  await pool.query('DELETE FROM download_tickets WHERE expires_at <= NOW()');
  await pool.query('DELETE FROM rate_limit_counters WHERE reset_time <= NOW()');
  await pool.query("DELETE FROM push_delivery_jobs WHERE status IN ('sent', 'failed', 'cancelled') AND next_attempt_at < NOW() - INTERVAL '30 days'");
}

export function startNotificationWorker(): () => Promise<void> {
  let work: Promise<void> | undefined, lastReminder = 0, stopping = false;
  const tick = () => {
    if (stopping || work) return;
    work = (async () => {
      await processPushJobs();
      if (Date.now() - lastReminder >= 60000) { await createEligibilityReminders(); lastReminder = Date.now(); }
    })().catch(() => { console.error('Notification worker failed'); }).finally(() => { work = undefined; });
  };
  tick(); const interval = setInterval(tick, 1000); interval.unref();
  return async () => { stopping = true; clearInterval(interval); await work; };
}
