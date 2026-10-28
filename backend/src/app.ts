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

export function createApp() {
  if (process.env.NODE_ENV === "production") assertEmailConfigured();
  const app = express();
  app.disable("x-powered-by");
  // Only explicitly configured proxy IPs/CIDRs may supply forwarding headers.
  if (process.env.TRUST_PROXY) app.set("trust proxy", process.env.TRUST_PROXY.split(",").map(value => value.trim()));
  app.use(helmet());
  const origins = process.env.CORS_ORIGINS?.split(",").map(value => value.trim()) ||
    (process.env.NODE_ENV === "production" ? [] : ["http://localhost:5173", "http://localhost:3000", "http://localhost:8081", "http://127.0.0.1:5173", "http://localhost:19006"]);
  app.use(cors({ origin: origins, credentials: true }));
  app.use(generalLimiter);
  app.use(express.json({ limit: "64kb" }));
  app.use(validateJsonBody);
  app.use("/api/auth", (req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); }, authRoutes);
  app.use("/api/organizations", organizationRoutes);
  app.use("/api/donors", donorRoutes);
  app.use("/api/requests", requestsRoutes);
  app.use("/api/staff", staffRoutes);
  app.use("/api/admin", adminRoutes);
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
    if (err.code === "23505") return res.status(409).json({ error: "An account or pending request with these details already exists" });
    if (["23503", "23514", "22001", "22P02"].includes(err.code)) return res.status(400).json({ error: "Invalid request data" });
    // Avoid logging SQL values, passwords, tokens, or driver connection strings.
    console.error("API request failed", { method: req.method, path: req.path, code: err.code || "INTERNAL" });
    return res.status(500).json({ error: "Internal server error" });
  });
  return app;
}
