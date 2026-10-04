import { Router } from "express";
import {
  registerStaff,
  listPendingStaff,
  approveStaff,
  rejectStaff,
} from "../controllers/staff.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", registerStaff);

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
  approveStaff,
);
router.patch(
  "/admin/:id/reject",
  authenticate,
  requireRole("admin"),
  rejectStaff,
);

export default router;
