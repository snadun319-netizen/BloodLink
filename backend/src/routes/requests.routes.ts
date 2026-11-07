import { Router } from "express";
import {
  getRequestsPageData,
  respondToAlert,
  notifyCoordinator,
  cancelMission,
} from "../controllers/requests.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { createBloodRequest, listInstitutionRequests, institutionRequestDetails, closeBloodRequest, dispatchBloodRequest, confirmDonation } from '../controllers/operations.controller';
import { validateRouteIds } from '../middleware/validation.middleware';

const router = Router();

// GET /api/requests/me - Complete real requests dashboard (alerts list & active mission)
router.use(authenticate);
router.get("/me", requireRole('donor'), getRequestsPageData);

// POST /api/requests/:id/respond - Donor responds to blood request (e.g. accepted / en_route)
router.post("/:id/respond", requireRole('donor'), validateRouteIds, respondToAlert);

// POST /api/requests/mission/:id/notify - Donor sends delay / status notification to hospital coordinator
router.post("/mission/:id/notify", requireRole('donor'), validateRouteIds, notifyCoordinator);

// POST /api/requests/mission/:id/cancel - Donor cancels active dispatch mission
router.post("/mission/:id/cancel", requireRole('donor'), validateRouteIds, cancelMission);
router.use(requireRole('hospital_staff', 'bloodbank_staff'));
router.get('/', listInstitutionRequests);
router.post('/', createBloodRequest);
router.get('/:id', validateRouteIds, institutionRequestDetails);
router.patch('/:id/status', validateRouteIds, closeBloodRequest);
router.post('/:id/dispatch', validateRouteIds, dispatchBloodRequest);
router.post('/:id/donations', validateRouteIds, confirmDonation);

export default router;
