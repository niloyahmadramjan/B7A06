import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { dashboardController } from "./dashboard.controller";

const router = Router();

router.get(
	"/admin",
	auth(UserRole.ADMIN, UserRole.MANAGER),
	dashboardController.getAdminStats,
);
router.get(
	"/manager",
	auth(UserRole.ADMIN, UserRole.MANAGER),
	dashboardController.getManagerStats,
);
router.get(
	"/technician",
	auth(UserRole.TECHNICIAN),
	dashboardController.getTechnicianStats,
);
router.get(
	"/customer",
	auth(UserRole.CUSTOMER),
	dashboardController.getCustomerStats,
);

export const dashboardRouter = router;
