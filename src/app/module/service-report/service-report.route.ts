import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { serviceReportController } from "./service-report.controller";
import {
	createServiceReportSchema,
	updateServiceReportSchema,
} from "./service-report.validation";

const validate = (schema: any) => (req: Request, _res: Response, next: NextFunction) => {
	const result = schema.safeParse(req.body);
	if (!result.success)
		return next(new AppError(httpStatus.BAD_REQUEST, result.error.issues.map((issue: { message: string }) => issue.message).join(", ")));
	req.body = result.data;
	next();
};

const router = Router();
router.post("/", auth(UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN), validate(createServiceReportSchema), serviceReportController.createServiceReport);
router.get("/", auth(UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN), serviceReportController.getAllServiceReports);
router.get("/:reportId", auth(UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN), serviceReportController.getServiceReportById);
router.patch("/:reportId", auth(UserRole.TECHNICIAN, UserRole.MANAGER, UserRole.ADMIN), validate(updateServiceReportSchema), serviceReportController.updateServiceReport);
router.delete("/:reportId", auth(UserRole.MANAGER, UserRole.ADMIN), serviceReportController.deleteServiceReport);

export const serviceReportRouter = router;