import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validate } from "../../middleware/validate";
import { workOrderController } from "./work-order.controller";
import { updateWorkOrderStatusSchema } from "./work-order.validation";

const router = Router();

router.get(
	"/",
	auth(
		UserRole.MANAGER,
		UserRole.ADMIN,
		UserRole.CUSTOMER,
		UserRole.TECHNICIAN,
	),
	workOrderController.getAllWorkOrders,
);

router.get(
	"/:workOrderId",
	auth(
		UserRole.MANAGER,
		UserRole.ADMIN,
		UserRole.CUSTOMER,
		UserRole.TECHNICIAN,
	),
	workOrderController.getWorkOrderById,
);

router.patch(
	"/:workOrderId/status",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	validate(updateWorkOrderStatusSchema),
	workOrderController.updateWorkOrderStatus,
);

export const workOrderRouter = router;
