import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { requestService } from "./request.service";

const createRequest = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user;
	const serviceId = req.params.serviceId as string;

	const result = await requestService.createRequest(payload, serviceId, user!);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Request created successfully",
		data: result,
	});
});
const getAllRequests = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;
	const user = req.user;

	const result = await requestService.getAllRequests(user!, query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Requests retrieved successfully",
		data: result,
	});
});

const getRequestById = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.requestId as string;
	const user = req.user;

	const result = await requestService.getRequestById(requestId, user!);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Requests retrieved successfully",
		data: result,
	});
});

const updateRequest = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.requestId as string;
	const user = req.user!;
	const payload = req.body;

	const result = await requestService.updateRequest(requestId, payload, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Requests updated successfully",
		data: result,
	});
});

const deleteRequest = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.requestId as string;
	const user = req.user!;

	const result = await requestService.deleteRequest(requestId, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Requests deleted successfully",
		data: result,
	});
});

const getAllRequestsForReview = catchAsync(
	async (req: Request, res: Response) => {
		const query = req.query;

		const result = await requestService.getAllRequestsForReview(query);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Requests retrieved successfully for review",
			data: result.data,
			meta: result.meta,
		});
	},
);

const getRequestByIdForReview = catchAsync(
	async (req: Request, res: Response) => {
		const requestId = req.params.requestId as string;

		const result = await requestService.getRequestByIdForReview(requestId);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Request retrieved successfully for review",
			data: result,
		});
	},
);

const approveRequest = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.requestId as string;

	const result = await requestService.approveRequest(requestId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Request approved successfully. Work order auto-generated.",
		data: result,
	});
});

const rejectRequest = catchAsync(async (req: Request, res: Response) => {
	const requestId = req.params.requestId as string;

	const result = await requestService.rejectRequest(requestId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Request rejected successfully",
		data: result,
	});
});

export const requestController = {
	createRequest,
	getAllRequests,
	getRequestById,
	updateRequest,
	deleteRequest,
	getAllRequestsForReview,
	getRequestByIdForReview,
	approveRequest,
	rejectRequest,
};
