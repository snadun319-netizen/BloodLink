import { pool } from "../db";
import { transaction } from "../transaction";
import { createPasswordResetOtp, cleanupExpiredOtps } from "./otp.service";
import { cleanupExpiredTokens } from "./token.service";
import { sendPasswordResetOtpEmail } from "./email.service";

// Queue only a user reference, never plaintext OTPs. SMTP work cannot affect the
// public request's response time, and pending jobs survive server restarts.
export async function enqueuePasswordReset(email: string): Promise<void> {
  await pool.query(
    `INSERT INTO password_reset_email_jobs (user_id)
     SELECT id FROM users WHERE LOWER(email) = $1 AND status = 'active'
     ON CONFLICT (user_id) DO UPDATE SET status = 'pending', attempts = 0,
       created_at = NOW(), next_attempt_at = NOW(), lease_until = NULL
     WHERE password_reset_email_jobs.created_at <= NOW() - INTERVAL '45 seconds'
       AND password_reset_email_jobs.status <> 'processing'`,
    [email]
  );
}

export async function processPasswordResetJobs(): Promise<void> {
  await pool.query("UPDATE password_reset_email_jobs SET status = 'failed', lease_until = NULL WHERE attempts >= 3 AND ((status = 'processing' AND lease_until < NOW()) OR status = 'pending')");
  const job = (await pool.query(
    `WITH candidate AS (
       SELECT id FROM password_reset_email_jobs
       WHERE (status = 'pending' AND next_attempt_at <= NOW())
          OR (status = 'processing' AND lease_until < NOW())
       ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
     )
     UPDATE password_reset_email_jobs job SET status = 'processing',
       lease_until = NOW() + INTERVAL '2 minutes', attempts = attempts + 1
     FROM candidate WHERE job.id = candidate.id RETURNING job.*`
  )).rows[0];
  if (!job) return;
  await transaction(async client => {
    const user = (await client.query("SELECT email, status FROM users WHERE id = $1 FOR UPDATE", [job.user_id])).rows[0];
    const currentJob = (await client.query("SELECT status FROM password_reset_email_jobs WHERE id = $1", [job.id])).rows[0];
    if (!currentJob || currentJob.status !== "processing") return;
    if (!user || user.status !== "active") {
      await client.query("UPDATE password_reset_email_jobs SET status = 'cancelled', lease_until = NULL WHERE id = $1", [job.id]);
      return;
    }
    try {
      const otp = await createPasswordResetOtp(job.user_id, client);
      await sendPasswordResetOtpEmail(user.email, otp);
      await client.query("UPDATE password_reset_email_jobs SET status = 'sent', lease_until = NULL WHERE id = $1", [job.id]);
      await client.query("INSERT INTO audit_logs (actor_user_id, action, target_type, target_id) VALUES ($1, 'PASSWORD_RESET_CODE_SENT', 'user', $1)", [job.user_id]);
    } catch {
      await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL", [job.user_id]);
      await client.query(
        "UPDATE password_reset_email_jobs SET status = $1, next_attempt_at = NOW() + INTERVAL '1 minute', lease_until = NULL WHERE id = $2",
        [job.attempts >= 3 ? "failed" : "pending", job.id]
      );
      console.error("Password reset delivery deferred or failed");
    }
  });
}

export function startPasswordResetWorker(): () => Promise<void> {
  let running: Promise<void> | undefined;
  let lastCleanup = 0;
  let stopping = false;
  const tick = () => {
    if (!stopping && !running) running = (async () => {
      await processPasswordResetJobs();
      if (Date.now() - lastCleanup >= 60000) {
        await cleanupExpiredOtps();
        await cleanupExpiredTokens();
        lastCleanup = Date.now();
      }
    })()
      .catch(() => { console.error("Password reset queue processing failed"); })
      .finally(() => { running = undefined; });
  };
  tick();
  const interval = setInterval(tick, 1000);
  interval.unref();
  return async () => { stopping = true; clearInterval(interval); await running; };
}
