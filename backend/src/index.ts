import { createApp } from "./app";
import { pool } from "./db";
import { startPasswordResetWorker } from "./services/passwordResetDelivery.service";

async function start() {
  await pool.query("SELECT token_version FROM users LIMIT 0");
  const app = createApp();
  const stopWorker = startPasswordResetWorker();
  const server = app.listen(process.env.PORT || 4000, () => console.log("BloodLink API server started"));
  const shutdown = () => {
    server.close(() => { void stopWorker().then(() => pool.end()).then(() => process.exit(0)); });
    setTimeout(() => process.exit(1), 30000).unref();
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
start().catch(async () => {
  console.error("Startup failed. Check database migrations, JWT secrets, and email configuration.");
  await pool.end();
  process.exitCode = 1;
});
