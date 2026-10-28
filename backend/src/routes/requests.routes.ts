import { Router } from "express";
import {
  getRequestsPageData,
  respondToAlert,
  notifyCoordinator,
  cancelMission,
} from "../controllers/requests.controller";
import { optionalAuthenticate } from "../middleware/auth.middleware";

const router = Router();

// GET /api/requests/me - Complete real requests dashboard (alerts list & active mission)
router.get("/me", optionalAuthenticate, getRequestsPageData);

// POST /api/requests/:id/respond - Donor responds to blood request (e.g. accepted / en_route)
router.post("/:id/respond", optionalAuthenticate, respondToAlert);

// POST /api/requests/mission/:id/notify - Donor sends delay / status notification to hospital coordinator
router.post("/mission/:id/notify", optionalAuthenticate, notifyCoordinator);

// POST /api/requests/mission/:id/cancel - Donor cancels active dispatch mission
router.post("/mission/:id/cancel", optionalAuthenticate, cancelMission);

export default router;
