import { Router } from "express";
import {
  registerOrganization,
  listPendingOrganizations,
  approveOrganization,
  rejectOrganization,
} from "../controllers/organization.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.post("/register", registerOrganization);

router.get("/admin/pending", authenticate, requireRole("admin"), listPendingOrganizations);
router.patch("/admin/:id/approve", authenticate, requireRole("admin"), approveOrganization);
router.patch("/admin/:id/reject", authenticate, requireRole("admin"), rejectOrganization);

export default router;