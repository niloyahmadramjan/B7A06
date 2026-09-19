import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { attachmentService } from "./attachment.service";

const createAttachment = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const data = await attachmentService.createAttachment(
		req.body,
		req.file,
		user,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Attachment uploaded successfully",
		data,
	});
});

const getAllAttachments = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const result = await attachmentService.getAllAttachments(req.query, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Attachments retrieved successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getAttachmentById = catchAsync(async (req: Request, res: Response) => {
	const attachmentId = req.params.attachmentId as string;
	const user = req.user!;

	const data = await attachmentService.getAttachmentById(attachmentId, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Attachment retrieved successfully",
		data,
	});
});

const deleteAttachment = catchAsync(async (req: Request, res: Response) => {
	const attachmentId = req.params.attachmentId as string;
	const user = req.user!;

	const data = await attachmentService.deleteAttachment(attachmentId, user);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Attachment deleted successfully",
		data,
	});
});

export const attachmentController = {
	createAttachment,
	getAllAttachments,
	getAttachmentById,
	deleteAttachment,
};
