import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { workOrderService } from "./work-order.service";

const getAllWorkOrders = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const result = await workOrderService.getAllWorkOrders(req.query, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Work Orders Retrieved Successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getWorkOrderById = catchAsync(async (req: Request, res: Response) => {
	const workOrderId = req.params.workOrderId as string;
	const user = req.user!;
	const data = await workOrderService.getWorkOrderById(workOrderId, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Work Order Retrieved Successfully",
		data,
	});
});

const updateWorkOrderStatus = catchAsync(
	async (req: Request, res: Response) => {
		const workOrderId = req.params.workOrderId as string;
		const user = req.user!;
		const data = await workOrderService.updateWorkOrderStatus(
			workOrderId,
			req.body,
			user,
		);
		sendResponse(res, {
			statusCode: httpStatus.OK,
			success: true,
			message: "Work Order Status Updated Successfully",
			data,
		});
	},
);

export const workOrderController = {
	getAllWorkOrders,
	getWorkOrderById,
	updateWorkOrderStatus,
};
