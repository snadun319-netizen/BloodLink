import { Router } from "express";
import {
  registerStaff,
  listPendingStaff,
  approveStaff,
  rejectStaff,
} from "../controllers/staff.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validateStaffInput, validateRouteIds } from "../middleware/validation.middleware";
import { registerLimiter } from "../middleware/rateLimiter.middleware";

const router = Router();

router.post("/register", registerLimiter, validateStaffInput, registerStaff);

router.get(
  "/admin/pending",
  authenticate,
  requireRole("admin"),
  listPendingStaff,
);
router.patch(
  "/admin/:id/approve",
  authenticate,
  requireRole("admin"),
  validateRouteIds,
  approveStaff,
);
router.patch(
  "/admin/:id/reject",
  authenticate,
  requireRole("admin"),
  validateRouteIds,
  rejectStaff,
);

export default router;
