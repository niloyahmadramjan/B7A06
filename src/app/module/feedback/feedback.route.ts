import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { feedbackController } from "./feedback.controller";
import { createFeedbackSchema } from "./feedback.validation";

const validate =
	(schema: any) => (req: Request, _res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);
		if (!result.success)
			return next(
				new AppError(
					httpStatus.BAD_REQUEST,
					result.error.issues
						.map((issue: { message: string }) => issue.message)
						.join(", "),
				),
			);
		req.body = result.data;
		next();
	};

const router = Router();
router.post(
	"/",
	auth(UserRole.CUSTOMER),
	validate(createFeedbackSchema),
	feedbackController.createFeedback,
);
router.get(
	"/",
	auth(
		UserRole.MANAGER,
		UserRole.ADMIN,
		UserRole.CUSTOMER,
		UserRole.TECHNICIAN,
	),
	feedbackController.getAllFeedbacks,
);
router.get(
	"/:feedbackId",
	auth(
		UserRole.MANAGER,
		UserRole.ADMIN,
		UserRole.CUSTOMER,
		UserRole.TECHNICIAN,
	),
	feedbackController.getFeedbackById,
);

export const feedbackRouter = router;
