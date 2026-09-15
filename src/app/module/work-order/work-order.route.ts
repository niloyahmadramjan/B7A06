import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { workOrderController } from "./work-order.controller";
import { createWorkOrderSchema, updateWorkOrderSchema } from "./work-order.validation";

const validateBody = (schema: { safeParse: (body: unknown) => { success: boolean; data?: unknown; error?: { issues: { message: string }[] } } }) =>
	(req: Request, _res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);
		if (!result.success) return next(new AppError(httpStatus.BAD_REQUEST, result.error?.issues.map((issue) => issue.message).join(", ") || "Invalid request body"));
		req.body = result.data;
		next();
	};

const router = Router();
const managerOnly = auth(UserRole.MANAGER, UserRole.ADMIN);

router.post("/", managerOnly, validateBody(createWorkOrderSchema), workOrderController.createWorkOrder);
router.get("/", managerOnly, workOrderController.getAllWorkOrders);
router.get("/:workOrderId", managerOnly, workOrderController.getWorkOrderById);
router.patch("/:workOrderId", managerOnly, validateBody(updateWorkOrderSchema), workOrderController.updateWorkOrder);
router.delete("/:workOrderId", managerOnly, workOrderController.deleteWorkOrder);

export const workOrderRouter = router;
