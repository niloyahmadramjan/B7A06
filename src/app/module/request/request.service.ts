import crypto from "node:crypto";
import httpstatus from "http-status";
import { ServiceRequestStatus } from "../../../generated/prisma/enums";
import type { ServiceRequestWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type { IQuery } from "../service/service.interface";
import type { ICreateServiceRequest } from "./request.interface";

const createRequest = async (
	payload: ICreateServiceRequest,
	serviceId: string,
	user: RequestUser,
) => {
	const existingCustomer = await prisma.customer.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!existingCustomer) {
		throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
	}

	const existingService = await prisma.service.findUnique({
		where: {
			id: serviceId,
		},
	});

	if (!existingService) {
		throw new AppError(httpstatus.NOT_FOUND, "Service not found!");
	}

	//   const requestNumber = crypto.randomBytes(4).toString("hex").toUpperCase();
	const requestNumber = `REQ-${Date.now()}-${crypto
		.randomBytes(2)
		.toString("hex")
		.toUpperCase()}`;

	const createRequest = await prisma.serviceRequest.create({
		data: {
			customerId: existingCustomer.id,
			serviceId: serviceId,
			title: payload.title,
			description: payload.description,
			preferredDate: payload.preferredDate,
			address: payload.address,
			city: payload.city,
			district: payload.district,
			requestNumber,
		},
	});

	return createRequest;
};

const getAllRequests = async (user: RequestUser, query: IQuery) => {
	const existingCustomer = await prisma.customer.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!existingCustomer) {
		throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
	}

	// and condition for search

	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: ServiceRequestWhereInput[] = [
		{
			customerId: existingCustomer.id,
		},
	];

	if (query.searchTerm) {
		andConditions.push({
			OR: [{ title: { contains: query.searchTerm, mode: "insensitive" } }],
		});
	}

	const requests = await prisma.serviceRequest.findMany({
		where: {
			AND: andConditions,
		},
		skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
	});

	const totalAvailableServices = await prisma.serviceRequest.count({
		where: { AND: andConditions },
	});

	return {
		data: requests,
		meta: {
			page,
			limit,
			total: totalAvailableServices,
			totalPages: Math.ceil(totalAvailableServices / limit),
		},
	};
};
const getRequestById = async (requestId: string, user: RequestUser) => {
	const existingCustomer = await prisma.customer.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!existingCustomer) {
		throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
	}

	const request = await prisma.serviceRequest.findFirst({
		where: {
			id: requestId,
			customerId: existingCustomer.id,
		},
	});

	if (!request) {
		throw new AppError(httpstatus.NOT_FOUND, "Request not found");
	}

	return request;
};
const updateRequest = async (
	requestId: string,
	payload: Partial<ICreateServiceRequest>,
	user: RequestUser,
) => {
	const existingCustomer = await prisma.customer.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!existingCustomer) {
		throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
	}

	const existingRequest = await prisma.serviceRequest.findFirst({
		where: {
			id: requestId,
			customerId: existingCustomer.id,
		},
	});

	if (!existingRequest) {
		throw new AppError(httpstatus.NOT_FOUND, "Request not found");
	}

	const { title, description, preferredDate, address, city, district } =
		payload;

	const updatedRequest = await prisma.serviceRequest.update({
		where: {
			id: requestId,
		},
		data: {
			title,
			description,
			preferredDate,
			address,
			city,
			district,
		},
	});

	return updatedRequest;
};

const getAllRequestsForReview = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: ServiceRequestWhereInput[] = [];

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ title: { contains: query.searchTerm, mode: "insensitive" } },
				{
					requestNumber: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
			],
		});
	}

	if (query.status) {
		andConditions.push({ status: query.status });
	}

	const requests = await prisma.serviceRequest.findMany({
		where: {
			AND: andConditions,
		},
		skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			customer: { include: { user: true } },
			service: true,
			workOrder: true,
		},
	});

	const total = await prisma.serviceRequest.count({
		where: { AND: andConditions },
	});

	return {
		data: requests,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

const getRequestByIdForReview = async (requestId: string) => {
	const request = await prisma.serviceRequest.findUnique({
		where: { id: requestId },
		include: {
			customer: { include: { user: true } },
			service: true,
			workOrder: true,
		},
	});

	if (!request) {
		throw new AppError(httpstatus.NOT_FOUND, "Request not found");
	}

	return request;
};

const approveRequest = async (requestId: string) => {
	const existing = await prisma.serviceRequest.findUnique({
		where: { id: requestId },
	});

	if (!existing) {
		throw new AppError(httpstatus.NOT_FOUND, "Request not found");
	}

	if (existing.status !== ServiceRequestStatus.PENDING) {
		throw new AppError(
			httpstatus.BAD_REQUEST,
			"Only pending requests can be approved",
		);
	}

	return prisma.$transaction(async (tx) => {
		const updated = await tx.serviceRequest.update({
			where: { id: requestId },
			data: { status: ServiceRequestStatus.APPROVED },
		});

		let workOrder = await tx.workOrder.findUnique({
			where: { requestId },
		});

		if (!workOrder) {
			workOrder = await tx.workOrder.create({
				data: {
					workOrderNumber: `WO-${Date.now()}-${crypto
						.randomBytes(2)
						.toString("hex")
						.toUpperCase()}`,
					requestId,
					customerId: existing.customerId,
					title: existing.title,
					description: existing.description,
				},
			});
		}

		return { request: updated, workOrder };
	});
};

const rejectRequest = async (requestId: string) => {
	const existing = await prisma.serviceRequest.findUnique({
		where: { id: requestId },
	});

	if (!existing) {
		throw new AppError(httpstatus.NOT_FOUND, "Request not found");
	}

	if (existing.status !== ServiceRequestStatus.PENDING) {
		throw new AppError(
			httpstatus.BAD_REQUEST,
			"Only pending requests can be rejected",
		);
	}

	return prisma.serviceRequest.update({
		where: { id: requestId },
		data: { status: ServiceRequestStatus.REJECTED },
	});
};

const deleteRequest = async (requestId: string, user: RequestUser) => {
	const existingCustomer = await prisma.customer.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!existingCustomer) {
		throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
	}

	const existingRequest = await prisma.serviceRequest.findFirst({
		where: {
			id: requestId,
			customerId: existingCustomer.id,
		},
	});

	if (!existingRequest) {
		throw new AppError(httpstatus.NOT_FOUND, "Request not found");
	}
	if (existingRequest.status !== ServiceRequestStatus.PENDING) {
		throw new AppError(
			httpstatus.BAD_REQUEST,
			"Only pending requests can be deleted",
		);
	}

	await prisma.serviceRequest.delete({
		where: {
			id: requestId,
			customerId: existingCustomer.id,
		},
	});

	return { message: "Request deleted successfully" };
};

export const requestService = {
	createRequest,
	getAllRequests,
	getRequestById,
	updateRequest,
	deleteRequest,
	getAllRequestsForReview,
	getRequestByIdForReview,
	approveRequest,
	rejectRequest,
};
