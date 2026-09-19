import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { dashboardService } from "./dashboard.service";

const getAdminStats = catchAsync(async (_req: Request, res: Response) => {
	const data = await dashboardService.getStaffStats();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Admin dashboard retrieved successfully",
		data,
	});
});

const getManagerStats = catchAsync(async (_req: Request, res: Response) => {
	const data = await dashboardService.getStaffStats();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Manager dashboard retrieved successfully",
		data,
	});
});

const getTechnicianStats = catchAsync(async (req: Request, res: Response) => {
	const data = await dashboardService.getTechnicianStats(req.user!.userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician dashboard retrieved successfully",
		data,
	});
});

const getCustomerStats = catchAsync(async (req: Request, res: Response) => {
	const data = await dashboardService.getCustomerStats(req.user!.userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Customer dashboard retrieved successfully",
		data,
	});
});

export const dashboardController = {
	getAdminStats,
	getManagerStats,
	getTechnicianStats,
	getCustomerStats,
};
