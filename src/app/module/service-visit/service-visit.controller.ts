import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { serviceVisitService } from "./service-visit.service";

const createServiceVisit = catchAsync(async (req: Request, res: Response) => {
	const data = await serviceVisitService.createServiceVisit(req.body);
	sendResponse(res, { statusCode: httpStatus.CREATED, success: true, message: "Service visit created successfully", data });
});
const getAllServiceVisits = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceVisitService.getAllServiceVisits(req.query, req.user!);
	sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Service visits retrieved successfully", data: result.data, meta: result.meta });
});
const getServiceVisitById = catchAsync(async (req: Request, res: Response) => {
	const data = await serviceVisitService.getServiceVisitById(req.params.visitId as string, req.user!);
	sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Service visit retrieved successfully", data });
});
const updateServiceVisit = catchAsync(async (req: Request, res: Response) => {
	const data = await serviceVisitService.updateServiceVisit(req.params.visitId as string, req.body, req.user!);
	sendResponse(res, { statusCode: httpStatus.OK, success: true, message: "Service visit updated successfully", data });
});
const deleteServiceVisit = catchAsync(async (req: Request, res: Response) => {
	const result = await serviceVisitService.deleteServiceVisit(req.params.visitId as string);
	sendResponse(res, { statusCode: httpStatus.OK, success: true, message: result.message, data: null });
});

export const serviceVisitController = { createServiceVisit, getAllServiceVisits, getServiceVisitById, updateServiceVisit, deleteServiceVisit };
