import dotenv from 'dotenv';
dotenv.config();

async function start() {
  const port = Number(process.env.PORT || 4000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
  const { donationIntervalDays } = await import('./services/coordination.service');
  donationIntervalDays();
  const { pool } = await import('./db');
  const { createApp } = await import('./app');
  const { startPasswordResetWorker } = await import('./services/passwordResetDelivery.service');
  const { startNotificationWorker } = await import('./services/notifications.service');
  // Check the current schema before opening the listener or starting workers.
  await pool.query('SELECT token_version FROM users LIMIT 0');
  await pool.query('SELECT district FROM donor_profiles LIMIT 0');
  await pool.query('SELECT read_at, closed_at FROM notifications LIMIT 0');
  await pool.query('SELECT id FROM verification_documents LIMIT 0');
  await pool.query('SELECT approval_status FROM blood_requests LIMIT 0');
  await pool.query('SELECT id FROM health_alerts LIMIT 0');
  await pool.query('SELECT consent_status,availability_updated_at FROM donor_profiles LIMIT 0');
  await pool.query('SELECT expires_at,outreach_target FROM blood_requests LIMIT 0');
  const app = createApp();
  const server = app.listen(port);
  await new Promise<void>((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const stops = [startPasswordResetWorker(), startNotificationWorker()];
  console.log(`BloodLink API server started on port ${(server.address() as import('net').AddressInfo).port}`);
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 30000); timeout.unref();
    const drained = new Promise<void>(resolve => server.close(() => resolve()));
    void Promise.all([drained, ...stops.map(stop => stop())]).then(() => pool.end()).then(() => {
      clearTimeout(timeout); process.exitCode = 0;
    }).catch(() => { process.exitCode = 1; });
  };
  process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
}

start().catch(async (error: unknown) => {
  const failure = error as { code?: string; message?: string };
  const code = failure.code || 'CONFIGURATION';
  const advice = ['42P01', '42703'].includes(code) ? 'Run npm run migrate (or db:init for an empty database).'
    : code === 'ECONNREFUSED' ? 'Start PostgreSQL and check DATABASE_URL host and port.'
    : code === '28P01' ? 'Check DATABASE_URL credentials.'
    : code === '3D000' ? 'Create the database named in DATABASE_URL.'
    : code === 'EADDRINUSE' ? 'The API port is already occupied.'
    : 'Check environment configuration, JWT secrets and delivery settings.';
  console.error(`Startup failed [${code}]. ${advice}`);
  try { await (await import('./db')).pool.end(); } catch { /* Configuration can fail before the pool is created. */ }
  process.exitCode = 1;
});
