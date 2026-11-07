import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pool } from "./db";
import authRoutes from "./routes/auth.routes";
import organizationRoutes from "./routes/organization.routes";
import donorRoutes from "./routes/donor.routes";
import staffRoutes from "./routes/staff.routes";
import adminRoutes from "./routes/admin.routes";
import requestsRoutes from "./routes/requests.routes";
import { generalLimiter } from "./middleware/rateLimiter.middleware";
import { validateJsonBody } from "./middleware/validation.middleware";
import { HttpError } from "./transaction";
import { assertEmailConfigured } from "./services/email.service";
import notificationsRoutes from './routes/notifications.routes';
import { stockRoutes, institutionRoutes } from './routes/operations.routes';
import { authenticate, requireRole } from './middleware/auth.middleware';
import { downloadVerificationDocument, downloadDonationRecord } from './controllers/documents.controller';
import { assertPushConfigured } from './services/notifications.service';

export function createApp() {
  if (process.env.NODE_ENV === "production") assertEmailConfigured();
  assertPushConfigured();
  const app = express();
  app.disable("x-powered-by");
  // Only explicitly configured proxy IPs/CIDRs may supply forwarding headers.
  if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY.split(",").map(value => value.trim()));
  app.use(helmet());
  const origins = process.env.CORS_ORIGINS?.split(",").map(value => value.trim()) ||
    (process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173", "http://localhost:3000", "http://localhost:8081", "http://127.0.0.1:5173", "http://localhost:19006"]);
  app.use(cors({ origin: origins, credentials: true }));
  app.use(generalLimiter);
  app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });
  app.use(express.json({ limit: "64kb", inflate: false }));
  app.use(validateJsonBody);
  app.use("/api/auth", (req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); }, authRoutes);
  app.use("/api/organizations", organizationRoutes);
  app.use("/api/donors", donorRoutes);
  app.use("/api/requests", requestsRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/admin", adminRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/stocks', stockRoutes);
  app.use('/api/institution', institutionRoutes);
  app.get('/api/documents/:id', authenticate, requireRole('donor', 'admin'), downloadVerificationDocument);
  app.get('/api/donation-records/:token', downloadDonationRecord);
  app.get("/", (req, res) => res.json({ name: "BloodLink REST API Server", status: "online", healthCheck: "/api/health" }));
  app.get("/api/health", async (req, res) => {
    try { await pool.query("SELECT 1"); res.json({ status: "ok" }); }
    catch { res.status(503).json({ status: "unavailable" }); }
  });
  app.use((req, res) => res.status(404).json({ error: "Endpoint not found" }));
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) return next(err);
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON" });
    if (err.type === "entity.too.large") return res.status(413).json({ error: "Request body too large" });
    if (['encoding.unsupported', 'charset.unsupported'].includes(err.type)) return res.status(415).json({ error: 'Unsupported request encoding' });
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Documents cannot exceed 5 MB' });
    if (typeof err.code === 'string' && err.code.startsWith('LIMIT_')) return res.status(400).json({ error: 'Invalid upload fields or file count' });
    if (err.message === 'Unexpected end of form' || err.message === 'Multipart: Boundary not found') return res.status(400).json({ error: 'Invalid multipart upload' });
    if (err.code === "23505") return res.status(409).json({ error: "An account or pending request with these details already exists" });
    if (["23503", "23514", "22001", "22P02"].includes(err.code)) return res.status(400).json({ error: "Invalid request data" });
    // Avoid logging SQL values, passwords, tokens, or driver connection strings.
    console.error("API request failed", { method: req.method, route: req.route?.path || '[unmatched]', code: err.code || "INTERNAL" });
    if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', '57P03', '53300', '57014'].includes(err.code)) return res.status(503).json({ error: 'Service temporarily unavailable' });
    if (['40P01', '40001'].includes(err.code)) return res.status(409).json({ error: 'Concurrent update; retry the operation' });
    return res.status(500).json({ error: "Internal server error" });
  });
  return app;
}
