import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { serviceServices } from "./service.service";

const createService = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;

	const result = await serviceServices.serviceCreate(payload);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Service created successfully",
		data: result,
	});
});

const allService = catchAsync(async (req: Request, res: Response) => {
	const query = req.query;

	const result = await serviceServices.allServices(query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Retrived the all services data successfully",
		data: result,
	});
});

const updateService = catchAsync(async (req: Request, res: Response) => {
	const serviceId = req.params.serviceId as string;
	const payload = req.body;

	const result = await serviceServices.updateService(payload, serviceId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Update services data successfully",
		data: result,
	});
});

const deleteServie = catchAsync(async (req: Request, res: Response) => {
	const serviceId = req.params.serviceId as string;
	const result = await serviceServices.deleteService(serviceId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Deleted services data successfully",
		data: result,
	});
});

export const serviceController = {
	createService,
	allService,
	updateService,
	deleteServie,
};
