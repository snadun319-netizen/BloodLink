import { Router } from "express";
import donorVerificationRoutes from "./donorVerification.routes";
import {
  getDonorHomeDashboard,
  getNearbyBloodRequests,
  getMyDonations,
  getMyProfile, updateMyProfile, setAvailability,
} from "../controllers/donor.controller";
import { getRequestsPageData, respondToAlert } from "../controllers/requests.controller";
import { getBloodBanks } from "../controllers/banks.controller";
import { authenticate, requireRole, optionalAuthenticate } from "../middleware/auth.middleware";
import { validateRouteIds } from "../middleware/validation.middleware";
import { documentUpload, uploadVerificationDocument, getDonationRecordLink } from "../controllers/documents.controller";
import { uploadLimiter } from "../middleware/rateLimiter.middleware";

const router = Router();

router.get('/banks', optionalAuthenticate, getBloodBanks);

// Donor verification routes (/submit, /admin/pending, /admin/:id/approve, etc.)
router.use(donorVerificationRoutes);
router.use(authenticate, requireRole('donor'));
router.get('/me', getMyProfile);
router.patch('/me', updateMyProfile);
router.patch('/me/availability', setAvailability);
router.post('/me/verification-documents', uploadLimiter, documentUpload, uploadVerificationDocument);
router.get('/me/donation-record', getDonationRecordLink);

// GET /api/donors/home - Personalized dashboard data (donor profile, emergency match, active requests)
router.get("/home", getDonorHomeDashboard);

// GET /api/donors/requests/me - Real requests page payload (alias for /api/requests/me)
router.get("/requests/me", getRequestsPageData);

// GET /api/donors/requests - Nearby active blood requests
router.get("/requests", getNearbyBloodRequests);

// POST /api/donors/requests/:id/respond - Donor responds to blood request (e.g. en_route)
router.post("/requests/:id/respond", validateRouteIds, respondToAlert);

// GET /api/donors/me/donations - Donation history of the donor
router.get("/me/donations", getMyDonations);

export default router;
