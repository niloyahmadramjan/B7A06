import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validate } from "../../middleware/validate";
import { userController } from "./user.controller";
import { updateUserProfileSchema } from "./user.validation";

const router = Router();

router.get(
	"/me",
	auth(
		UserRole.CUSTOMER,
		UserRole.TECHNICIAN,
		UserRole.MANAGER,
		UserRole.ADMIN,
	),
	userController.getMe,
);

router.patch(
	"/me",
	auth(
		UserRole.CUSTOMER,
		UserRole.TECHNICIAN,
		UserRole.MANAGER,
		UserRole.ADMIN,
	),
	validate(updateUserProfileSchema),
	userController.updateMe,
);

export const UsersRouter = router;
