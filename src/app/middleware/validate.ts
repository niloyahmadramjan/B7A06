import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { ZodType } from "zod";
import { AppError } from "../utils/AppError";

export const validate =
	(schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);
		if (!result.success) {
			return next(
				new AppError(
					httpStatus.BAD_REQUEST,
					result.error.issues.map((issue) => issue.message).join(", "),
				),
			);
		}
		req.body = result.data;
		next();
	};
