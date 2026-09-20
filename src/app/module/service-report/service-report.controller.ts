import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { serviceReportService } from "./service-report.service";

const createServiceReport = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const data = await serviceReportService.createServiceReport(req.body, user);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Service Report Created Successfully",
		data,
	});
});

const getAllServiceReports = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const result = await serviceReportService.getAllServiceReports(
		req.query,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service Reports Retrieved Successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getServiceReportById = catchAsync(async (req: Request, res: Response) => {
	const reportId = req.params.reportId as string;
	const user = req.user!;
	const data = await serviceReportService.getServiceReportById(reportId, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service Report Retrieved Successfully",
		data,
	});
});

const updateServiceReport = catchAsync(async (req: Request, res: Response) => {
	const reportId = req.params.reportId as string;
	const user = req.user!;
	const data = await serviceReportService.updateServiceReport(
		reportId,
		req.body,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service Report Updated Successfully",
		data,
	});
});

export const serviceReportController = {
	createServiceReport,
	getAllServiceReports,
	getServiceReportById,
	updateServiceReport,
};
