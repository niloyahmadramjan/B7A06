import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validate } from "../../middleware/validate";
import { serviceReportController } from "./service-report.controller";
import {
	createServiceReportSchema,
	updateServiceReportSchema,
} from "./service-report.validation";

const router = Router();

router.post(
	"/",
	auth(UserRole.TECHNICIAN),
	validate(createServiceReportSchema),
	serviceReportController.createServiceReport,
);

router.get(
	"/",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN),
	serviceReportController.getAllServiceReports,
);

router.get(
	"/:reportId",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN),
	serviceReportController.getServiceReportById,
);

router.patch(
	"/:reportId",
	auth(UserRole.TECHNICIAN),
	validate(updateServiceReportSchema),
	serviceReportController.updateServiceReport,
);

export const serviceReportRouter = router;
