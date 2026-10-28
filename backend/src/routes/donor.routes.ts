import { Router } from "express";
import donorVerificationRoutes from "./donorVerification.routes";
import {
  getDonorHomeDashboard,
  respondToBloodRequest,
  getNearbyBloodRequests,
  getMyDonations,
} from "../controllers/donor.controller";
import { getRequestsPageData } from "../controllers/requests.controller";
import { optionalAuthenticate } from "../middleware/auth.middleware";
import { validateRouteIds } from "../middleware/validation.middleware";

const router = Router();

// Donor verification routes (/submit, /admin/pending, /admin/:id/approve, etc.)
router.use(donorVerificationRoutes);

// GET /api/donors/home - Personalized dashboard data (donor profile, emergency match, active requests)
router.get("/home", optionalAuthenticate, getDonorHomeDashboard);

// GET /api/donors/requests/me - Real requests page payload (alias for /api/requests/me)
router.get("/requests/me", optionalAuthenticate, getRequestsPageData);

// GET /api/donors/requests - Nearby active blood requests
router.get("/requests", optionalAuthenticate, getNearbyBloodRequests);

// POST /api/donors/requests/:id/respond - Donor responds to blood request (e.g. en_route)
router.post("/requests/:id/respond", optionalAuthenticate, validateRouteIds, respondToBloodRequest);

// GET /api/donors/me/donations - Donation history of the donor
router.get("/me/donations", optionalAuthenticate, getMyDonations);

export default router;
