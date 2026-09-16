import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { serviceVisitController } from "./service-visit.controller";
import { createServiceVisitSchema, updateServiceVisitSchema } from "./service-visit.validation";

const validate = (schema: any) => (req: Request, _res: Response, next: NextFunction) => {
	const result = schema.safeParse(req.body);
	if (!result.success)
		return next(new AppError(httpStatus.BAD_REQUEST, result.error.issues.map((issue: { message: string }) => issue.message).join(", ")));
	req.body = result.data;
	next();
};

const router = Router();
router.post("/", auth(UserRole.MANAGER, UserRole.ADMIN), validate(createServiceVisitSchema), serviceVisitController.createServiceVisit);
router.get("/", auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN), serviceVisitController.getAllServiceVisits);
router.get("/:visitId", auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN), serviceVisitController.getServiceVisitById);
router.patch("/:visitId", auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN), validate(updateServiceVisitSchema), serviceVisitController.updateServiceVisit);
router.delete("/:visitId", auth(UserRole.MANAGER, UserRole.ADMIN), serviceVisitController.deleteServiceVisit);

export const serviceVisitRouter = router;
