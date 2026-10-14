import { Router } from "express";
import {
  registerOrganization,
  listPendingOrganizations,
  approveOrganization,
  rejectOrganization,
} from "../controllers/organization.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validateOrganizationInput, validateRouteIds } from "../middleware/validation.middleware";
import { registerLimiter } from "../middleware/rateLimiter.middleware";

const router = Router();

router.post("/register", registerLimiter, validateOrganizationInput, registerOrganization);

router.get("/admin/pending", authenticate, requireRole("admin"), listPendingOrganizations);
router.patch("/admin/:id/approve", authenticate, requireRole("admin"), validateRouteIds, approveOrganization);
router.patch("/admin/:id/reject", authenticate, requireRole("admin"), validateRouteIds, rejectOrganization);

export default router;
