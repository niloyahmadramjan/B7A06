import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { customerService } from "./customer.service";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

const getCustomerProfile = catchAsync(async (req: Request, res: Response) => {
  const id = req.user?.userId;

  const result = await customerService.getCustomerProfile(id!);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "customer profile retrived successfully",
    data: result,
  });
});

const updateCustomerProfile = catchAsync(
  async (req: Request, res: Response) => {
    const id = req.user?.userId;
    const payload = req.body;

    const result = await customerService.updateCusomerProfile(payload, id!);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "customer profile update successfully",
      data: result,
    });
  },
);

export const customerController = {
  getCustomerProfile,
  updateCustomerProfile,
};
