import crypto from 'node:crypto';
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { positiveId } from '../middleware/validation.middleware';
import { pool } from '../db';
import { transaction, HttpError } from '../transaction';

export async function listNotifications(req: AuthRequest, res: Response) {
  const limit = req.query.limit === undefined ? 100 : positiveId(req.query.limit);
  const before = req.query.before === undefined ? null : positiveId(req.query.before);
  if (limit > 100) throw new HttpError(400, 'Limit cannot exceed 100');
  const rows = (await pool.query(`SELECT n.id, n.kind, n.category, n.title, n.message, n.request_id, n.read_at, n.sent_at,
    o.district, EXISTS(SELECT 1 FROM health_alerts a WHERE a.notification_id = n.id AND a.donor_id = n.donor_id) AS private_health_message
    FROM notifications n LEFT JOIN blood_requests r ON r.id = n.request_id
    LEFT JOIN organizations o ON o.id = r.organization_id
    WHERE n.donor_id = $1 AND (n.request_id IS NULL OR r.approval_status = 'Approved')
      AND ($2::integer IS NULL OR n.id < $2) ORDER BY n.id DESC LIMIT $3`, [req.user!.id, before, limit])).rows;
  res.json(rows.map(row => ({ id: String(row.id), kind: row.kind, category: row.category, title: row.title,
    body: row.message, requestId: row.request_id == null ? undefined : String(row.request_id),
    createdAt: row.sent_at, isRead: !!row.read_at, location: row.district || undefined, hasPrivateMessage: row.private_health_message })));
}
export async function readNotification(req: AuthRequest, res: Response) {
  const updated = await pool.query('UPDATE notifications SET read_at = COALESCE(read_at, NOW()) WHERE id = $1 AND donor_id = $2 RETURNING id', [positiveId(req.params.id), req.user!.id]);
  if (!updated.rowCount) throw new HttpError(404, 'Notification not found');
  res.json({ success: true });
}
export async function readAllNotifications(req: AuthRequest, res: Response) {
  await pool.query('UPDATE notifications SET read_at = NOW() WHERE donor_id = $1 AND read_at IS NULL', [req.user!.id]);
  res.json({ success: true });
}
export async function registerPushDevice(req: AuthRequest, res: Response) {
  const token = req.body.token;
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096 || /\s/.test(token)) throw new HttpError(400, 'Invalid FCM device token');
  if (process.env.PUSH_TRANSPORT !== 'fcm') throw new HttpError(503, 'Push delivery is not configured; in-app notifications are available');
  const device = await transaction(async client => {
    await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [req.user!.id]);
    const existing = (await client.query('SELECT id, user_id FROM push_devices WHERE token = $1', [token])).rows[0];
    if (existing && String(existing.user_id) !== req.user!.id) throw new HttpError(409, 'Device token is already registered');
    const count = (await client.query('SELECT COUNT(*)::integer AS count FROM push_devices WHERE user_id = $1', [req.user!.id])).rows[0].count;
    if (!existing && count >= 10) throw new HttpError(409, 'Device limit reached');
    const id = existing?.id || crypto.randomUUID();
    await client.query(`INSERT INTO push_devices(id, user_id, token, family_id) VALUES ($1, $2, $3, $4)
      ON CONFLICT (token) DO UPDATE SET updated_at = NOW(), family_id = $4 WHERE push_devices.user_id = $2`, [id, req.user!.id, token, req.user!.sid]);
    return { id };
  });
  res.status(201).json({ device });
}
export async function unregisterPushDevice(req: AuthRequest, res: Response) {
  const id = req.params.id;
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) throw new HttpError(400, 'Invalid device ID');
  await pool.query('DELETE FROM push_devices WHERE id = $1 AND user_id = $2', [id, req.user!.id]);
  res.json({ success: true });
}
