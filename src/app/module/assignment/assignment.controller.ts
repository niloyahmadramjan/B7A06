import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { assignmentService } from "./assignment.service";

const createAssignment = catchAsync(async (req: Request, res: Response) => {
	const data = await assignmentService.createAssignment(req.body, req.user!);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Assignment created successfully",
		data,
	});
});
const getAllAssignments = catchAsync(async (req: Request, res: Response) => {
	const r = await assignmentService.getAllAssignments(req.query, req.user!);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignments retrieved successfully",
		data: r.data,
		meta: r.meta,
	});
});
const getAssignmentById = catchAsync(async (req: Request, res: Response) => {
	const data = await assignmentService.getAssignmentById(
		req.params.assignmentId as string,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment retrieved successfully",
		data,
	});
});
const acceptAssignment = catchAsync(async (req: Request, res: Response) => {
	const data = await assignmentService.respondToAssignment(
		req.params.assignmentId as string,
		true,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment accepted successfully",
		data,
	});
});
const rejectAssignment = catchAsync(async (req: Request, res: Response) => {
	const data = await assignmentService.respondToAssignment(
		req.params.assignmentId as string,
		false,
		req.user!,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assignment rejected successfully",
		data,
	});
});
const deleteAssignment = catchAsync(async (req: Request, res: Response) => {
	const r = await assignmentService.deleteAssignment(
		req.params.assignmentId as string,
	);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: r.message,
		data: null,
	});
});
export const assignmentController = {
	createAssignment,
	getAllAssignments,
	getAssignmentById,
	acceptAssignment,
	rejectAssignment,
	deleteAssignment,
};
