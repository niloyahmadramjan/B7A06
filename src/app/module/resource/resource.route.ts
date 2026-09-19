import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validate } from "../../middleware/validate";
import { resourceController } from "./resource.controller";
import {
	assignResourceSchema,
	createResourceSchema,
	updateResourceSchema,
	updateResourceStatusSchema,
} from "./resource.validation";

const router = Router();

router.post(
	"/",
	auth(UserRole.CUSTOMER),
	validate(createResourceSchema),
	resourceController.createResource,
);

router.get(
	"/search",
	auth(
		UserRole.MANAGER,
		UserRole.ADMIN,
		UserRole.CUSTOMER,
		UserRole.TECHNICIAN,
	),
	resourceController.searchResources,
);

router.get(
	"/my-assigned",
	auth(UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN),
	resourceController.getMyAssignedResources,
);

router.get(
	"/",
	auth(
		UserRole.MANAGER,
		UserRole.ADMIN,
		UserRole.CUSTOMER,
		UserRole.TECHNICIAN,
	),
	resourceController.getAllResources,
);

router.get(
	"/:id",
	auth(
		UserRole.MANAGER,
		UserRole.ADMIN,
		UserRole.CUSTOMER,
		UserRole.TECHNICIAN,
	),
	resourceController.getResourceById,
);

router.patch(
	"/:id",
	auth(UserRole.CUSTOMER, UserRole.MANAGER, UserRole.ADMIN),
	validate(updateResourceSchema),
	resourceController.updateResource,
);

router.delete(
	"/:id",
	auth(UserRole.CUSTOMER, UserRole.MANAGER, UserRole.ADMIN),
	resourceController.deleteResource,
);

router.post(
	"/:id/assign",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	validate(assignResourceSchema),
	resourceController.assignResource,
);

router.patch(
	"/:id/status",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	validate(updateResourceStatusSchema),
	resourceController.updateResourceStatus,
);

router.post(
	"/:id/cancel",
	auth(UserRole.CUSTOMER, UserRole.MANAGER, UserRole.ADMIN),
	resourceController.cancelResource,
);

export const resourceRouter = router;
