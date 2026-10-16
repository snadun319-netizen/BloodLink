import { Router } from "express";
import {
  listUsers,
  updateUserStatus,
  getDashboardStats,
  listAuditLogs,
} from "../controllers/admin.controller";
import { authenticate, requireRole } from "../middleware/auth.middleware";
import { validateRouteIds, validateAdminQuery, validateNetworkOrganization, validateOrganizationAccess, validateStaffInput } from "../middleware/validation.middleware";
import { listNetworkOrganizations, networkOverview, networkOrganizationDetails, createNetworkOrganization, editNetworkOrganization, setNetworkOrganizationAccess, listNetworkStaff, createNetworkStaff } from "../controllers/networkAdmin.controller";

const router = Router();

router.use(authenticate, requireRole("admin"));
router.use(validateAdminQuery);
router.use("/users/:id", validateRouteIds);

router.get("/users", listUsers);
router.patch("/users/:id/status", updateUserStatus);
router.get("/stats", getDashboardStats);
router.get("/audit-logs", listAuditLogs);
router.get("/network-overview", networkOverview);
router.get("/organizations", listNetworkOrganizations);
router.post("/organizations", validateNetworkOrganization, createNetworkOrganization);
router.get("/organizations/:id", validateRouteIds, networkOrganizationDetails);
router.patch("/organizations/:id", validateRouteIds, validateNetworkOrganization, editNetworkOrganization);
router.patch("/organizations/:id/access", validateRouteIds, validateOrganizationAccess, setNetworkOrganizationAccess);
router.get("/staff", listNetworkStaff);
router.post("/staff", validateStaffInput, createNetworkStaff);

export default router;
