import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { invoiceService } from "./invoice.service";

const createInvoice = catchAsync(async (req: Request, res: Response) => {
	const data = await invoiceService.createInvoice(req.body, req.user!);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Invoice created successfully",
		data,
	});
});

const addInvoiceItem = catchAsync(async (req: Request, res: Response) => {
	const data = await invoiceService.addInvoiceItem(
		req.params.invoiceId as string,
		req.body,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Additional cost added to invoice successfully",
		data,
	});
});

const deleteInvoiceItem = catchAsync(async (req: Request, res: Response) => {
	const data = await invoiceService.deleteInvoiceItem(
		req.params.invoiceId as string,
		req.params.itemId as string,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Additional cost removed from invoice successfully",
		data,
	});
});

const getAllInvoices = catchAsync(async (req: Request, res: Response) => {
	const result = await invoiceService.getAllInvoices(req.query, req.user!);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Invoices retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});
const getInvoiceById = catchAsync(async (req: Request, res: Response) => {
	const data = await invoiceService.getInvoiceById(
		req.params.invoiceId as string,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Invoice retrieved successfully",
		data,
	});
});
const updateInvoice = catchAsync(async (req: Request, res: Response) => {
	const data = await invoiceService.updateInvoice(
		req.params.invoiceId as string,
		req.body,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Invoice updated successfully",
		data,
	});
});
const deleteInvoice = catchAsync(async (req: Request, res: Response) => {
	const result = await invoiceService.deleteInvoice(
		req.params.invoiceId as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: result.message,
		data: null,
	});
});

export const invoiceController = {
	createInvoice,
	addInvoiceItem,
	deleteInvoiceItem,
	getAllInvoices,
	getInvoiceById,
	updateInvoice,
	deleteInvoice,
};
