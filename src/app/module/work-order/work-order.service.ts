import crypto from "crypto";
import httpStatus from "http-status";
import type { WorkOrderWhereInput } from "../../../generated/prisma/models";
import {
	ServiceRequestStatus,
	TechnicianStatus,
	WorkOrderStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type {
	ICreateWorkOrder,
	IUpdateWorkOrder,
	IWorkOrderQuery,
} from "./work-order.interface";

const createWorkOrder = async (payload: ICreateWorkOrder) => {
	const request = await prisma.serviceRequest.findUnique({
		where: { id: payload.requestId },
	});

	if (!request) {
		throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
	}

	if (request.status !== ServiceRequestStatus.APPROVED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A work order can only be created from an approved service request",
		);
	}

	const existingWorkOrder = await prisma.workOrder.findUnique({
		where: { requestId: request.id },
	});
	if (existingWorkOrder) {
		throw new AppError(
			httpStatus.CONFLICT,
			"A work order already exists for this service request",
		);
	}

	return prisma.workOrder.create({
		data: {
			workOrderNumber: `WO-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
			requestId: request.id,
			customerId: request.customerId,
			title: payload.title ?? request.title,
			description: payload.description ?? request.description,
			estimatedCost: payload.estimatedCost,
		},
	});
};

const getAllWorkOrders = async (query: IWorkOrderQuery) => {
	const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
	const page = Math.max(Number(query.page) || 1, 1);
	const where: WorkOrderWhereInput = {
		...(query.status ? { status: query.status } : {}),
		...(query.searchTerm
			? {
				OR: [
					{ workOrderNumber: { contains: query.searchTerm, mode: "insensitive" } },
					{ title: { contains: query.searchTerm, mode: "insensitive" } },
				],
			}
			: {}),
	};

	const [data, total] = await Promise.all([
		prisma.workOrder.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: { request: true, customer: true, technician: true },
		}),
		prisma.workOrder.count({ where }),
	]);

	return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getWorkOrderById = async (workOrderId: string) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id: workOrderId },
		include: { request: true, customer: true, technician: true },
	});
	if (!workOrder) throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	return workOrder;
};

const allowedTransitions: Record<WorkOrderStatus, WorkOrderStatus[]> = {
	CREATED: [WorkOrderStatus.ASSIGNED, WorkOrderStatus.CANCELLED],
	ASSIGNED: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
	IN_PROGRESS: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
	COMPLETED: [],
	CANCELLED: [],
};

const updateWorkOrder = async (workOrderId: string, payload: IUpdateWorkOrder) => {
	const existing = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
	if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Work order not found");

	if (payload.technicianId) {
		const technician = await prisma.technician.findUnique({ where: { id: payload.technicianId } });
		if (!technician || technician.status === TechnicianStatus.OFFLINE) {
			throw new AppError(httpStatus.BAD_REQUEST, "Technician is not available for assignment");
		}
	}

	// Assigning a technician is the assignment action in this API, so a newly
	// created work order moves to ASSIGNED even when the client omits status.
	const nextStatus =
		payload.status ??
		(payload.technicianId && existing.status === WorkOrderStatus.CREATED
			? WorkOrderStatus.ASSIGNED
			: undefined);
	if (nextStatus && nextStatus !== existing.status && !allowedTransitions[existing.status].includes(nextStatus)) {
		throw new AppError(httpStatus.BAD_REQUEST, `Cannot change status from ${existing.status} to ${nextStatus}`);
	}
	if (nextStatus === WorkOrderStatus.ASSIGNED && !(payload.technicianId ?? existing.technicianId)) {
		throw new AppError(httpStatus.BAD_REQUEST, "A technician is required before assigning a work order");
	}
	if (nextStatus === WorkOrderStatus.IN_PROGRESS && !existing.technicianId && !payload.technicianId) {
		throw new AppError(httpStatus.BAD_REQUEST, "A technician is required before starting a work order");
	}

	return prisma.workOrder.update({
		where: { id: workOrderId },
		data: {
			...payload,
			...(nextStatus ? { status: nextStatus } : {}),
			...(nextStatus === WorkOrderStatus.IN_PROGRESS && !payload.startedAt && !existing.startedAt
				? { startedAt: new Date() }
				: {}),
			...(nextStatus === WorkOrderStatus.COMPLETED && !payload.completedAt
				? { completedAt: new Date() }
				: {}),
		},
	});
};

const deleteWorkOrder = async (workOrderId: string) => {
	const existing = await prisma.workOrder.findUnique({ where: { id: workOrderId } });
	if (!existing) throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	if (existing.status === WorkOrderStatus.IN_PROGRESS || existing.status === WorkOrderStatus.COMPLETED) {
		throw new AppError(httpStatus.BAD_REQUEST, "In-progress or completed work orders cannot be deleted");
	}
	await prisma.workOrder.delete({ where: { id: workOrderId } });
	return { message: "Work order deleted successfully" };
};

export const workOrderService = {
	createWorkOrder,
	getAllWorkOrders,
	getWorkOrderById,
	updateWorkOrder,
	deleteWorkOrder,
};
