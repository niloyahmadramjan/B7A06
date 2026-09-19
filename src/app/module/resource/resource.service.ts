import httpStatus from "http-status";
import {
	ServiceRequestStatus,
	UserRole,
} from "../../../generated/prisma/enums";
import type { ServiceRequestWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import { assignmentService } from "../assignment/assignment.service";
import { requestService } from "../request/request.service";
import type {
	ICreateResource,
	IResourceQuery,
	IUpdateResource,
} from "./resource.interface";

const include = {
	customer: {
		include: {
			user: { select: { id: true, name: true, email: true, phone: true } },
		},
	},
	service: true,
	workOrder: {
		include: {
			technician: {
				include: {
					user: { select: { id: true, name: true, email: true, phone: true } },
				},
			},
		},
	},
} as const;

const parseQuery = (query: IResourceQuery) => {
	const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
	const page = Math.max(Number(query.page) || 1, 1);
	const sortBy = query.sortBy ?? "createdAt";
	const sortOrder: "asc" | "desc" = query.sortOrder === "asc" ? "asc" : "desc";
	return { limit, page, sortBy, sortOrder };
};

const getAllResources = async (query: IResourceQuery, user: RequestUser) => {
	const { limit, page, sortBy, sortOrder } = parseQuery(query);
	const term = query.searchTerm ?? query.q;

	const where: ServiceRequestWhereInput = {
		deletedAt: null,
		...(query.status ? { status: query.status } : {}),
		...(query.serviceId ? { serviceId: query.serviceId } : {}),
		...(query.customerId ? { customerId: query.customerId } : {}),
		...(user.role === UserRole.CUSTOMER
			? { customer: { userId: user.userId } }
			: {}),
		...(term
			? {
					OR: [
						{ title: { contains: term, mode: "insensitive" } },
						{ requestNumber: { contains: term, mode: "insensitive" } },
						{ description: { contains: term, mode: "insensitive" } },
					],
				}
			: {}),
	};

	const [data, total] = await Promise.all([
		prisma.serviceRequest.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
			include,
		}),
		prisma.serviceRequest.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getResourceById = async (id: string, user: RequestUser) => {
	const resource = await prisma.serviceRequest.findFirst({
		where: { id, deletedAt: null },
		include,
	});

	if (!resource) {
		throw new AppError(httpStatus.NOT_FOUND, "Resource Not Found");
	}

	if (
		user.role === UserRole.CUSTOMER &&
		resource.customer.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Can Only Access Your Own Resources",
		);
	}

	if (
		user.role === UserRole.TECHNICIAN &&
		resource.workOrder?.technician?.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Can Only Access Resources Assigned To You",
		);
	}

	return resource;
};

const createResource = async (payload: ICreateResource, user: RequestUser) => {
	return requestService.createRequest(
		{ customerId: "", ...payload },
		payload.serviceId,
		user,
	);
};

const updateResource = async (
	id: string,
	payload: IUpdateResource,
	user: RequestUser,
) => {
	const resource = await getResourceById(id, user);

	if (resource.status !== ServiceRequestStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only Pending Resources Can Be Updated",
		);
	}

	return prisma.serviceRequest.update({
		where: { id },
		data: payload,
		include,
	});
};

const deleteResource = async (id: string, user: RequestUser) => {
	await getResourceById(id, user);

	await prisma.serviceRequest.update({
		where: { id },
		data: { deletedAt: new Date() },
	});

	return { message: "Resource Deleted Successfully" };
};

const searchResources = async (query: IResourceQuery, user: RequestUser) => {
	return getAllResources({ ...query, searchTerm: query.q }, user);
};

const assignResource = async (
	id: string,
	technicianId: string,
	user: RequestUser,
) => {
	const resource = await prisma.serviceRequest.findFirst({
		where: { id, deletedAt: null },
		include: { workOrder: true },
	});

	if (!resource) {
		throw new AppError(httpStatus.NOT_FOUND, "Resource Not Found");
	}

	if (!resource.workOrder) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Approve The Request Before Assigning A Technician",
		);
	}

	const assignment = await assignmentService.createAssignment(
		{ workOrderId: resource.workOrder.id, technicianId },
		user,
	);

	await recordAuditLog({
		actorId: user.userId,
		action: "ASSIGN",
		entity: "ServiceRequest",
		entityId: id,
		changes: { technicianId },
	});

	return assignment;
};

const updateResourceStatus = async (
	id: string,
	status: ServiceRequestStatus,
	user: RequestUser,
) => {
	const resource = await prisma.serviceRequest.findFirst({
		where: { id, deletedAt: null },
	});

	if (!resource) {
		throw new AppError(httpStatus.NOT_FOUND, "Resource Not Found");
	}

	if (status === resource.status) {
		return resource;
	}

	if (
		status === ServiceRequestStatus.APPROVED ||
		status === ServiceRequestStatus.REJECTED
	) {
		if (resource.status !== ServiceRequestStatus.PENDING) {
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Only Pending Requests Can Be Approved Or Rejected",
			);
		}

		const result =
			status === ServiceRequestStatus.APPROVED
				? await requestService.approveRequest(id)
				: await requestService.rejectRequest(id);

		await recordAuditLog({
			actorId: user.userId,
			action: status,
			entity: "ServiceRequest",
			entityId: id,
		});

		return result;
	}

	if (
		resource.status === ServiceRequestStatus.REJECTED ||
		resource.status === ServiceRequestStatus.CANCELLED
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot Change Status From ${resource.status} To ${status}`,
		);
	}

	const updated = await prisma.serviceRequest.update({
		where: { id },
		data: { status },
		include,
	});

	await recordAuditLog({
		actorId: user.userId,
		action: status,
		entity: "ServiceRequest",
		entityId: id,
	});

	return updated;
};

const cancelResource = async (id: string, user: RequestUser) => {
	const resource = await getResourceById(id, user);

	if (resource.status === ServiceRequestStatus.CANCELLED) {
		throw new AppError(httpStatus.BAD_REQUEST, "Resource Is Already Cancelled");
	}

	if (resource.status === ServiceRequestStatus.REJECTED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A Rejected Resource Cannot Be Cancelled",
		);
	}

	const updated = await prisma.serviceRequest.update({
		where: { id },
		data: { status: ServiceRequestStatus.CANCELLED },
		include,
	});

	await recordAuditLog({
		actorId: user.userId,
		action: "CANCEL",
		entity: "ServiceRequest",
		entityId: id,
	});

	return updated;
};

const getMyAssignedResources = async (
	query: IResourceQuery,
	user: RequestUser,
) => {
	const technician = await prisma.technician.findUnique({
		where: { userId: user.userId },
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician Profile Not Found");
	}

	const { limit, page, sortBy, sortOrder } = parseQuery(query);

	const where: ServiceRequestWhereInput = {
		deletedAt: null,
		workOrder: { is: { technicianId: technician.id } },
		...(query.status ? { status: query.status } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.serviceRequest.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
			include,
		}),
		prisma.serviceRequest.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

export const resourceService = {
	getAllResources,
	getResourceById,
	createResource,
	updateResource,
	deleteResource,
	searchResources,
	assignResource,
	updateResourceStatus,
	cancelResource,
	getMyAssignedResources,
};
