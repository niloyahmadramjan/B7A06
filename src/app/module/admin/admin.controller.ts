import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { adminService } from "./admin.service";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
	const result = await adminService.getAllUsers(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Users Retrieved Successfully",
		data: result.data,
		meta: result.meta,
	});
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await adminService.updateUserRole(
		req.params.id as string,
		req.body.role,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "User Role Updated Successfully",
		data,
	});
});

const getDashboardStats = catchAsync(async (_req: Request, res: Response) => {
	const data = await adminService.getDashboardStats();
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Dashboard Stats Retrieved Successfully",
		data,
	});
});

const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
	const result = await adminService.getAuditLogs(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Audit Logs Retrieved Successfully",
		data: result.data,
		meta: result.meta,
	});
});

export const adminController = {
	getAllUsers,
	updateUserRole,
	getDashboardStats,
	getAuditLogs,
};
