import { Router } from "express";
import {
  getDonorHomeDashboard,
  respondToBloodRequest,
  getNearbyBloodRequests,
  getMyDonations,
} from "../controllers/donor.controller";
import { optionalAuthenticate } from "../middleware/auth.middleware";
import { validateRouteIds } from "../middleware/validation.middleware";

const router = Router();

// GET /api/donors/home - Personalized dashboard data (donor profile, emergency match, active requests)
router.get("/home", optionalAuthenticate, getDonorHomeDashboard);

// GET /api/donors/requests - Nearby active blood requests
router.get("/requests", optionalAuthenticate, getNearbyBloodRequests);

// POST /api/donors/requests/:id/respond - Donor responds to blood request (e.g. en_route)
router.post("/requests/:id/respond", optionalAuthenticate, validateRouteIds, respondToBloodRequest);

// GET /api/donors/me/donations - Donation history of the donor
router.get("/me/donations", optionalAuthenticate, getMyDonations);

export default router;
