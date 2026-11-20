import { Router } from "express";
import {
  submitDonorVerification,
  listDistrictPendingDonorVerifications, approveDistrictDonorVerification, rejectDistrictDonorVerification,
} from "../controllers/donorVerification.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validateVerificationInput, validateRouteIds, validateReviewInput } from "../middleware/validation.middleware";

const router = Router();

router.post("/submit", authenticate, requireRole("donor"), validateVerificationInput, submitDonorVerification);

router.get("/district-admin/pending", authenticate, requireRole("bloodbank_staff"), listDistrictPendingDonorVerifications);
router.patch("/district-admin/:id/approve", authenticate, requireRole("bloodbank_staff"), validateRouteIds, approveDistrictDonorVerification);
router.patch("/district-admin/:id/reject", authenticate, requireRole("bloodbank_staff"), validateRouteIds, validateReviewInput, rejectDistrictDonorVerification);

export default router;
