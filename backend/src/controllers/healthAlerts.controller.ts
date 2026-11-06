import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { positiveId, text } from '../middleware/validation.middleware';
import { pool } from '../db';
import { transaction, HttpError } from '../transaction';
import { audit, queueNotificationPush } from '../services/coordination.service';

// Clinical messages are visible only to the sending institution and recipient.
export async function listHealthAlerts(req: AuthRequest, res: Response) {
  const alerts = (await pool.query(`SELECT a.id, a.donor_id, a.subject, a.message, a.created_at,
    dp.full_name, dp.phone, u.email AS sent_by_email
    FROM health_alerts a JOIN donor_profiles dp ON dp.user_id = a.donor_id
    LEFT JOIN users u ON u.id = a.sent_by WHERE a.organization_id = $1
    ORDER BY a.id DESC LIMIT 200`, [req.user!.orgId])).rows;
  res.json({ alerts });
}

export async function healthAlertRecipients(req: AuthRequest, res: Response) {
  const donors = (await pool.query(`SELECT dp.user_id AS id, dp.full_name, dp.phone FROM donor_profiles dp
    JOIN users u ON u.id = dp.user_id WHERE u.role = 'donor' AND u.status = 'active'
    AND EXISTS (SELECT 1 FROM donations d WHERE d.donor_id = dp.user_id AND d.organization_id = $1)
    ORDER BY dp.full_name, dp.user_id LIMIT 1000`, [req.user!.orgId])).rows;
  res.json({ donors });
}

export async function sendHealthAlert(req: AuthRequest, res: Response) {
  const donorId = positiveId(req.body.donorId), subject = text(req.body.subject, 'subject', 150);
  const message = req.body.message;
  if (typeof message !== 'string' || !message.trim() || message.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f<>]/.test(message)) throw new HttpError(400, 'A private message of 1–2000 characters is required');
  const alert = await transaction(async client => {
    const org = (await client.query('SELECT id FROM organizations WHERE id = $1 AND is_active AND verification_status = $2 FOR SHARE', [req.user!.orgId, 'approved'])).rows[0];
    if (!org) throw new HttpError(403, 'Institution is not active and approved');
    const donor = (await client.query(`SELECT u.id FROM users u WHERE u.id = $1 AND u.role = 'donor' AND u.status = 'active'
      AND EXISTS (SELECT 1 FROM donations d WHERE d.donor_id = u.id AND d.organization_id = $2) FOR SHARE`, [donorId, org.id])).rows[0];
    if (!donor) throw new HttpError(404, 'Donor has no donation record at your institution');
    // The inbox and lock screen carry only a generic notice. The donor explicitly opens the private message.
    const notification = (await client.query(`INSERT INTO notifications(donor_id, title, message, kind, category)
      VALUES ($1, 'Private health message', 'Your donation institution has sent a private message. Open it to view the details.', 'health_advisory', 'doctor') RETURNING id`, [donorId])).rows[0];
    const row = (await client.query(`INSERT INTO health_alerts(organization_id, donor_id, sent_by, subject, message, notification_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [org.id, donorId, req.user!.id, subject, message, notification.id])).rows[0];
    await queueNotificationPush(client, [notification.id]);
    await audit(client, req, 'HEALTH_ALERT_SENT', 'health_alert', row.id);
    return { id: row.id };
  });
  res.status(201).json({ alert });
}

export async function donorHealthAlert(req: AuthRequest, res: Response) {
  const id = positiveId(req.params.id);
  const alert = (await pool.query(`SELECT a.id, a.subject, a.message, a.created_at, o.name AS institution
    FROM health_alerts a JOIN organizations o ON o.id = a.organization_id
    WHERE a.notification_id = $1 AND a.donor_id = $2`, [id, req.user!.id])).rows[0];
  if (!alert) throw new HttpError(404, 'Health message not found');
  res.json({ alert });
}
