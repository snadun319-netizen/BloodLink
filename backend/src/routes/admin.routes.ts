import { Router } from "express";
import {
  listUsers,
  updateUserStatus,
  getDashboardStats,
  listAuditLogs,
} from "../controllers/admin.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate, requireRole("admin"));

router.get("/users", listUsers);
router.patch("/users/:id/status", updateUserStatus);
router.get("/stats", getDashboardStats);
router.get("/audit-logs", listAuditLogs);

export default router;
