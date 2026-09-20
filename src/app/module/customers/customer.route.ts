import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { customerController } from "./customer.controller";

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
