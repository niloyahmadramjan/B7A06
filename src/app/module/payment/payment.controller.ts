import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentServices } from "./payment.service";

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const { data, meta } = await PaymentServices.getMyPayments(req.query, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payments Retrieved Successfully",
		data,
		meta,
	});
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await PaymentServices.getAllPayments(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payments Retrieved Successfully",
		data,
		meta,
	});
});

const getSinglePayment = catchAsync(async (req: Request, res: Response) => {
	const paymentId = req.params.paymentId as string;
	const user = req.user!;

	const result = await PaymentServices.getSinglePayment(paymentId, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Retrieved Successfully",
		data: result,
	});
});

const payInvoice = catchAsync(async (req: Request, res: Response) => {
	const invoiceId = req.params.invoiceId as string;
	const user = req.user!;

	const result = await PaymentServices.payInvoice(invoiceId, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Initiated Successfully",
		data: result,
	});
});

const paymentCallback = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentServices.paymentCallback(req.query);
	res.redirect(result.redirectUrl);
});

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;
	const invoiceId = (req.body?.invoiceId ?? req.query.invoiceId) as
		| string
		| undefined;

	if (!invoiceId) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invoice ID Is Required");
	}

	const result = await PaymentServices.payInvoice(invoiceId, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Initiated Successfully",
		data: result,
	});
});

const paymentWebhook = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentServices.paymentCallback({
		...req.query,
		...req.body,
	});
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment Webhook Processed Successfully",
		data: result,
	});
});

export const PaymentController = {
	getMyPayments,
	getAllPayments,
	getSinglePayment,
	payInvoice,
	initiatePayment,
	paymentCallback,
	paymentWebhook,
};
