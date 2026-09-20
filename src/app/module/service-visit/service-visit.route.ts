import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validate } from "../../middleware/validate";
import { serviceVisitController } from "./service-visit.controller";
import {
	createServiceVisitSchema,
	updateServiceVisitSchema,
} from "./service-visit.validation";

const router = Router();
router.post(
	"/",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	validate(createServiceVisitSchema),
	serviceVisitController.createServiceVisit,
);
router.get(
	"/",
	auth(
		UserRole.MANAGER,
		UserRole.ADMIN,
		UserRole.TECHNICIAN,
		UserRole.CUSTOMER,
	),
	serviceVisitController.getAllServiceVisits,
);
router.get(
	"/:visitId",
	auth(
		UserRole.MANAGER,
		UserRole.ADMIN,
		UserRole.TECHNICIAN,
		UserRole.CUSTOMER,
	),
	serviceVisitController.getServiceVisitById,
);
router.patch(
	"/:visitId",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN),
	validate(updateServiceVisitSchema),
	serviceVisitController.updateServiceVisit,
);
router.delete(
	"/:visitId",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	serviceVisitController.deleteServiceVisit,
);

export const serviceVisitRouter = router;
