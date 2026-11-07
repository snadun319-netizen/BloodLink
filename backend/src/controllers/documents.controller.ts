import crypto from 'node:crypto';
import path from 'node:path';
import { Response, RequestHandler } from 'express';
import multer from 'multer';
import PDFDocument from 'pdfkit';
import { AuthRequest } from '../middleware/auth.middleware';
import { BLOOD_GROUPS, text } from '../middleware/validation.middleware';
import { HttpError, transaction } from '../transaction';
import { pool } from '../db';
import { hashToken } from '../services/token.service';
import { lockDonor, audit } from '../services/coordination.service';
import { profileData, donationHistory } from './donor.controller';
import { scanDocument } from '../services/documentScan.service';

const parseDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 16, parts: 2, headerPairs: 50 },
  fileFilter: (_req, file, callback) => {
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.mimetype)) return callback(new HttpError(400, 'Upload a PDF, JPEG or PNG document'));
    callback(null, true);
  },
}).single('document');
export const documentUpload: RequestHandler = (req, res, next) => {
  parseDocument(req, res, error => {
    if (!error) return next();
    if (error instanceof HttpError || error instanceof multer.MulterError) return next(error);
    next(new HttpError(400, 'Invalid multipart upload'));
  });
};

function validatedFile(file: Express.Multer.File | undefined) {
  if (!file?.buffer?.length) throw new HttpError(400, 'A verification document is required');
  const signatures: Record<string, { prefix: Buffer; extensions: string[] }> = {
    'application/pdf': { prefix: Buffer.from('%PDF-'), extensions: ['.pdf'] },
    'image/png': { prefix: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), extensions: ['.png'] },
    'image/jpeg': { prefix: Buffer.from([255, 216, 255]), extensions: ['.jpg', '.jpeg'] },
  };
  const policy = signatures[file.mimetype];
  const name = text(path.basename(file.originalname), 'file name', 255);
  if (!policy || !policy.extensions.includes(path.extname(name).toLowerCase()) || !file.buffer.subarray(0, policy.prefix.length).equals(policy.prefix) || /[:\\/]/.test(name)) throw new HttpError(400, 'Document content, file extension and MIME type must match');
  return { name, mime: file.mimetype, content: file.buffer };
}

export async function uploadVerificationDocument(req: AuthRequest, res: Response) {
  const file = validatedFile(req.file), id = crypto.randomUUID();
  await scanDocument(file.content);
  await transaction(async client => {
    const donor = await lockDonor(client, req.user!.id);
    const group = req.body.claimedBloodGroup || donor.blood_group;
    if (!BLOOD_GROUPS.includes(group)) throw new HttpError(400, 'A valid claimed blood group is required');
    if ((await client.query("SELECT id FROM donor_verifications WHERE donor_id = $1 AND status = 'pending'", [req.user!.id])).rowCount) throw new HttpError(409, 'You already have a pending verification request');
    const count = (await client.query('SELECT COUNT(*)::integer AS count FROM verification_documents WHERE owner_id = $1', [req.user!.id])).rows[0].count;
    if (count >= 20) throw new HttpError(409, 'Document storage limit reached; contact an administrator');
    await client.query('INSERT INTO verification_documents(id, owner_id, file_name, mime_type, content) VALUES ($1, $2, $3, $4, $5)', [id, req.user!.id, file.name, file.mime, file.content]);
    await client.query('INSERT INTO donor_verifications(donor_id, document_url, claimed_blood_group) VALUES ($1, $2, $3)', [req.user!.id, `/api/documents/${id}`, group]);
    await audit(client, req, 'VERIFICATION_DOCUMENT_UPLOADED', 'user', req.user!.id);
  });
  res.status(201).json(await profileData(req.user!.id));
}

export async function downloadVerificationDocument(req: AuthRequest, res: Response) {
  const id = req.params.id;
  if (typeof id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) throw new HttpError(400, 'Invalid document ID');
  const row = (await pool.query(`SELECT file_name, mime_type, content FROM verification_documents
    WHERE id = $1 AND (owner_id = $2 OR $3::boolean)`, [id, req.user!.id, req.user!.role === 'admin'])).rows[0];
  if (!row) throw new HttpError(404, 'Document not found');
  res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  res.attachment(row.file_name).type(row.mime_type).send(row.content);
}

export async function getDonationRecordLink(req: AuthRequest, res: Response) {
  const token = crypto.randomBytes(32).toString('hex');
  await pool.query(`INSERT INTO download_tickets(token_hash, user_id, token_version, family_id, expires_at)
    VALUES ($1, $2, $3, $4, NOW() + INTERVAL '2 minutes')`, [hashToken(token), req.user!.id, req.user!.tokenVersion, req.user!.sid]);
  // Relative URLs avoid trusting client Host / X-Forwarded-Host headers.
  res.json({ url: `/api/donation-records/${token}`, expiresIn: 120 });
}

export async function downloadDonationRecord(req: AuthRequest, res: Response) {
  const token = req.params.token;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new HttpError(404, 'Download expired or unavailable');
  const ticket = await transaction(async client => {
    const row = (await client.query(`DELETE FROM download_tickets t USING users u
      WHERE t.token_hash = $1 AND t.user_id = u.id AND t.expires_at > NOW()
        AND u.status = 'active' AND u.role = 'donor' AND u.token_version = t.token_version
        AND EXISTS(SELECT 1 FROM refresh_tokens r WHERE r.user_id = u.id AND r.family_id = t.family_id AND NOT r.is_revoked AND r.expires_at > NOW())
      RETURNING t.user_id`, [hashToken(token)])).rows[0];
    if (!row) throw new HttpError(404, 'Download expired or unavailable');
    return row;
  });
  const history = await donationHistory(String(ticket.user_id));
  const pdf = new PDFDocument({ margin: 48, info: { Title: 'BloodLink Donation Record' } });
  // Build before sending headers so PDF failures still get a safe JSON response.
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    pdf.on('data', chunk => chunks.push(chunk)); pdf.on('end', () => resolve(Buffer.concat(chunks))); pdf.on('error', reject);
  });
  pdf.fontSize(20).text('BloodLink Donation Record').moveDown();
  pdf.fontSize(12).text(history.donorName).text(`Blood group: ${history.summary.bloodGroup || 'Not recorded'}`)
    .text(`Recorded donations: ${history.summary.totalDonations}`).text(`Generated: ${new Date().toISOString().slice(0, 10)}`).moveDown();
  for (const record of history.records) pdf.text(`${record.donatedAt} - ${record.hospitalName} - ${record.volumeMl} ml`).moveDown(0.4);
  if (!history.records.length) pdf.text('No donations recorded.');
  pdf.end();
  res.attachment('bloodlink-donation-record.pdf').type('application/pdf').send(await completed);
}
