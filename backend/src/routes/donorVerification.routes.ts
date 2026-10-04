import { Router } from "express";
import {
  submitDonorVerification,
  listPendingDonorVerifications,
  approveDonorVerification,
  rejectDonorVerification,
} from "../controllers/donorVerification.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.post("/submit", authenticate, requireRole("donor"), submitDonorVerification);

router.get("/admin/pending", authenticate, requireRole("admin"), listPendingDonorVerifications);
router.patch("/admin/:id/approve", authenticate, requireRole("admin"), approveDonorVerification);
router.patch("/admin/:id/reject", authenticate, requireRole("admin"), rejectDonorVerification);

export default router;