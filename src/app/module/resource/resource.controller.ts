import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { resourceService } from "./resource.service";

const createResource = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await resourceService.createResource(req.body, user);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Resource Created Successfully",
		data,
	});
});

const getAllResources = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await resourceService.getAllResources(req.query, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resources Retrieved Successfully",
		data: result.data,
		meta: result.meta,
	});
});

const searchResources = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await resourceService.searchResources(req.query, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resources Searched Successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getResourceById = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await resourceService.getResourceById(
		req.params.id as string,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resource Retrieved Successfully",
		data,
	});
});

const updateResource = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await resourceService.updateResource(
		req.params.id as string,
		req.body,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resource Updated Successfully",
		data,
	});
});

const deleteResource = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await resourceService.deleteResource(
		req.params.id as string,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.message,
		data: null,
	});
});

const assignResource = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await resourceService.assignResource(
		req.params.id as string,
		req.body.technicianId,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resource Assigned Successfully",
		data,
	});
});

const updateResourceStatus = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await resourceService.updateResourceStatus(
		req.params.id as string,
		req.body.status,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resource Status Updated Successfully",
		data,
	});
});

const cancelResource = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await resourceService.cancelResource(
		req.params.id as string,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Resource Cancelled Successfully",
		data,
	});
});

const getMyAssignedResources = catchAsync(
	async (req: Request, res: Response) => {
		const user = req.user!;

		const result = await resourceService.getMyAssignedResources(
			req.query,
			user,
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Assigned Resources Retrieved Successfully",
			data: result.data,
			meta: result.meta,
		});
	},
);

export const resourceController = {
	createResource,
	getAllResources,
	searchResources,
	getResourceById,
	updateResource,
	deleteResource,
	assignResource,
	updateResourceStatus,
	cancelResource,
	getMyAssignedResources,
};
