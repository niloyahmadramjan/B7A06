import { Router } from "express";
import { customerController } from "./customer.controller";
import { auth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.get(
	"/get",
	auth(UserRole.CUSTOMER),
	customerController.getCustomerProfile,
);

router.put(
	"/update",
	auth(UserRole.CUSTOMER),
	customerController.updateCustomerProfile,
);

export const CustomerRouter = router;
