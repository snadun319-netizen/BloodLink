import { Router } from "express";
import {
  listUsers,
  updateUserStatus,
  getDashboardStats,
} from "../controllers/admin.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate, requireRole("admin"));

router.get("/users", listUsers);
router.patch("/users/:id/status", updateUserStatus);
router.get("/stats", getDashboardStats);

export default router;