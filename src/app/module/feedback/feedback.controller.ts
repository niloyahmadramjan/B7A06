import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { feedbackService } from "./feedback.service";

const createFeedback = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await feedbackService.createFeedback(req.body, user);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Feedback Submitted Successfully",
		data,
	});
});

const getAllFeedbacks = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await feedbackService.getAllFeedbacks(req.query, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Feedbacks Retrieved Successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getFeedbackById = catchAsync(async (req: Request, res: Response) => {
	const feedbackId = req.params.feedbackId as string;
	const user = req.user!;

	const data = await feedbackService.getFeedbackById(feedbackId, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Feedback Retrieved Successfully",
		data,
	});
});

export const feedbackController = {
	createFeedback,
	getAllFeedbacks,
	getFeedbackById,
};
