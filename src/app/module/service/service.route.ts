import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { serviceController } from "./service.controller";

const router = Router();

router.post(
	"/create",
	auth(UserRole.ADMIN, UserRole.MANAGER),
	serviceController.createService,
);

router.get("/get-all", serviceController.allService);

router.put(
	"/update/:serviceId",
	auth(UserRole.ADMIN, UserRole.MANAGER),
	serviceController.updateService,
);

router.delete(
	"/delete/:serviceId",
	auth(UserRole.ADMIN, UserRole.MANAGER),
	serviceController.deleteServie,
);

export const ServiceRouter = router;
