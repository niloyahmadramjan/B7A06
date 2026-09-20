import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { technicianService } from "./technician.service";

const applyAsTechnician = catchAsync(async (req: Request, res: Response) => {
	const data = await technicianService.applyAsTechnician(req.body, req.user!);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Technician application submitted successfully",
		data,
	});
});

const getMyApplication = catchAsync(async (req: Request, res: Response) => {
	const data = await technicianService.getMyApplication(req.user!);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician application retrieved successfully",
		data,
	});
});

const getAllTechnicians = catchAsync(async (req: Request, res: Response) => {
	const result = await technicianService.getAllTechnicians(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technicians retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getTechnicianById = catchAsync(async (req: Request, res: Response) => {
	const data = await technicianService.getTechnicianById(
		req.params.technicianId as string,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician retrieved successfully",
		data,
	});
});

const approveTechnician = catchAsync(async (req: Request, res: Response) => {
	const data = await technicianService.approveTechnician(
		req.params.technicianId as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message:
			"Technician application approved. User role updated to TECHNICIAN.",
		data,
	});
});

const rejectTechnician = catchAsync(async (req: Request, res: Response) => {
	const data = await technicianService.rejectTechnician(
		req.params.technicianId as string,
		req.body?.reason,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician application rejected",
		data,
	});
});

const updateTechnician = catchAsync(async (req: Request, res: Response) => {
	const data = await technicianService.updateTechnician(
		req.params.technicianId as string,
		req.body,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Technician profile updated successfully",
		data,
	});
});

const deleteTechnician = catchAsync(async (req: Request, res: Response) => {
	const result = await technicianService.deleteTechnician(
		req.params.technicianId as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.message,
		data: null,
	});
});

export const technicianController = {
	applyAsTechnician,
	getMyApplication,
	getAllTechnicians,
	getTechnicianById,
	approveTechnician,
	rejectTechnician,
	updateTechnician,
	deleteTechnician,
};
