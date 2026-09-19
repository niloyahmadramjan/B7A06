import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validate } from "../../middleware/validate";
import { adminController } from "./admin.controller";
import { updateUserRoleSchema } from "./admin.validation";

const router = Router();

router.get(
	"/users",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	adminController.getAllUsers,
);

router.patch(
	"/users/:id/role",
	auth(UserRole.ADMIN),
	validate(updateUserRoleSchema),
	adminController.updateUserRole,
);

router.get(
	"/dashboard-stats",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	adminController.getDashboardStats,
);

router.get("/audit-logs", auth(UserRole.ADMIN), adminController.getAuditLogs);

export const adminRouter = router;
