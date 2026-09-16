import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { workOrderService } from "./work-order.service";

const createWorkOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await workOrderService.createWorkOrder(req.body);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Work order created successfully",
    data: result,
  });
});

const getAllWorkOrders = catchAsync(async (req: Request, res: Response) => {
  const result = await workOrderService.getAllWorkOrders(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Work orders retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

const getWorkOrderById = catchAsync(async (req: Request, res: Response) => {
  const result = await workOrderService.getWorkOrderById(
    req.params.workOrderId as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Work order retrieved successfully",
    data: result,
  });
});

const updateWorkOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await workOrderService.updateWorkOrder(
    req.params.workOrderId as string,
    req.body,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Work order updated successfully",
    data: result,
  });
});

const deleteWorkOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await workOrderService.deleteWorkOrder(
    req.params.workOrderId as string,
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: null,
  });
});

export const workOrderController = {
  createWorkOrder,
  getAllWorkOrders,
  getWorkOrderById,
  updateWorkOrder,
  deleteWorkOrder,
};
