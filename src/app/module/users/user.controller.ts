import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { userService } from "./user.service";

const getMe = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await userService.getMe(user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile Retrieved Successfully",
		data,
	});
});

const updateMe = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await userService.updateMe(req.body, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile Updated Successfully",
		data,
	});
});

export const userController = { getMe, updateMe };
