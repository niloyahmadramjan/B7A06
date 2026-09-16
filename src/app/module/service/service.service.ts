import type { ServiceWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { IQuery, servicePayload } from "./service.interface";
import HttpStatus from "http-status";

const serviceCreate = async (servicePayload: servicePayload) => {
	const existingService = await prisma.service.findFirst({
		where: {
			name: servicePayload.name,
			price: servicePayload.price,
		},
	});

	if (existingService) {
		throw new AppError(
			HttpStatus.CONFLICT,
			"This service already existing try to create another service",
		);
	}

	const createServiceResult = await prisma.service.create({
		data: {
			name: servicePayload.name,
			description: servicePayload.description,
			price: servicePayload.price,
		},
	});

	return {
		createServiceResult,
	};
};

const allServices = async (query: IQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: ServiceWhereInput[] = [];

	if (query.searchTerm) {
		andConditions.push({
			OR: [{ name: { contains: query.searchTerm, mode: "insensitive" } }],
		});
	}

	const allService = await prisma.service.findMany({
		where: {
			AND: andConditions,
		},
		skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
	});

	const totalAvailableServices = await prisma.service.count({
		where: { AND: andConditions },
	});

	return {
		data: allService,
		meta: {
			page,
			limit,
			total: totalAvailableServices,
			totalPages: Math.ceil(totalAvailableServices / limit),
		},
	};
};

const updateService = async (payload: servicePayload, id: string) => {
	const existingService = await prisma.service.findUnique({
		where: {
			id,
		},
	});
	if (!existingService) {
		throw new AppError(HttpStatus.NOT_FOUND, "oops service not found");
	}
	const updateServiceResult = await prisma.service.update({
		where: {
			id,
		},
		data: {
			...payload,
		},
	});
	return updateServiceResult;
};

const deleteService = async (id: string) => {
	const existingService = await prisma.service.findUnique({
		where: {
			id,
		},
	});
	if (!existingService) {
		throw new AppError(HttpStatus.NOT_FOUND, "oops service not found");
	}

	const deleteService = await prisma.service.delete({
		where: {
			id,
		},
	});
	return deleteService;
};

export const serviceServices = {
	serviceCreate,
	allServices,
	updateService,
	deleteService,
};
