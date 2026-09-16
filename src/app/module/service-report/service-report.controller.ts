import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { serviceReportService } from "./service-report.service";

const createServiceReport = catchAsync(async (req: Request, res: Response) => {
	const data = await serviceReportService.createServiceReport(
		req.body,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Service report created and work order completed successfully",
		data,
	});
});
const getAllServiceReports = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceReportService.getAllServiceReports(
		req.query,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service reports retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});
const getServiceReportById = catchAsync(async (req: Request, res: Response) => {
	const data = await serviceReportService.getServiceReportById(
		req.params.reportId as string,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service report retrieved successfully",
		data,
	});
});
const updateServiceReport = catchAsync(async (req: Request, res: Response) => {
	const data = await serviceReportService.updateServiceReport(
		req.params.reportId as string,
		req.body,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service report updated successfully",
		data,
	});
});
const deleteServiceReport = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceReportService.deleteServiceReport(
		req.params.reportId as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.message,
		data: null,
	});
});

export const serviceReportController = {
	createServiceReport,
	getAllServiceReports,
	getServiceReportById,
	updateServiceReport,
	deleteServiceReport,
};