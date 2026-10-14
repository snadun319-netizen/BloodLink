import { Router } from "express";
import {
  submitDonorVerification,
  listPendingDonorVerifications,
  approveDonorVerification,
  rejectDonorVerification,
} from "../controllers/donorVerification.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validateVerificationInput, validateRouteIds, validateReviewInput } from "../middleware/validation.middleware";

const router = Router();

router.post("/submit", authenticate, requireRole("donor"), validateVerificationInput, submitDonorVerification);

router.get("/admin/pending", authenticate, requireRole("admin"), listPendingDonorVerifications);
router.patch("/admin/:id/approve", authenticate, requireRole("admin"), validateRouteIds, approveDonorVerification);
router.patch("/admin/:id/reject", authenticate, requireRole("admin"), validateRouteIds, validateReviewInput, rejectDonorVerification);

export default router;
