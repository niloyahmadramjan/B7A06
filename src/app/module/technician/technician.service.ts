import httpStatus from "http-status";
import {
	TechnicianApplicationStatus,
	UserRole,
} from "../../../generated/prisma/enums";
import type { TechnicianWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	IApplyTechnician,
	ITechnicianQuery,
	IUpdateTechnician,
} from "./technician.interface";

const includeUser = { user: { omit: { passwordHash: true } } } as const;

const generateTechnicianId = () => {
	const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);

	return `TECH-${timestamp}`;
};

const applyAsTechnician = async (
	payload: IApplyTechnician,
	user: RequestUser,
) => {
	const existing = await prisma.technician.findUnique({
		where: { userId: user.userId },
	});

	if (existing) {
		if (existing.applicationStatus === TechnicianApplicationStatus.PENDING) {
			throw new AppError(
				httpStatus.CONFLICT,
				"You already have a pending technician application",
			);
		}
		if (existing.applicationStatus === TechnicianApplicationStatus.APPROVED) {
			throw new AppError(httpStatus.CONFLICT, "You are already a technician");
		}

		return prisma.technician.update({
			where: { id: existing.id },
			data: {
				skills: payload.skills,
				bio: payload.bio,
				rejectedReason: null,
				applicationStatus: TechnicianApplicationStatus.PENDING,
			},
			include: includeUser,
		});
	}

	return prisma.technician.create({
		data: {
			userId: user.userId,
			employeeId: generateTechnicianId(),
			skills: payload.skills,
			bio: payload.bio,
		},
		include: includeUser,
	});
};

const getMyApplication = async (user: RequestUser) => {
	const tech = await prisma.technician.findUnique({
		where: { userId: user.userId },
		include: includeUser,
	});

	if (!tech) {
		throw new AppError(httpStatus.NOT_FOUND, "No technician application found");
	}

	return tech;
};

const getAllTechnicians = async (query: ITechnicianQuery) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy ? query.sortBy : "createdAt";
	const sortOrder = query.sortOrder ? query.sortOrder : "desc";

	const andConditions: TechnicianWhereInput[] = [];

	if (query.applicationStatus) {
		andConditions.push({ applicationStatus: query.applicationStatus });
	}

	if (query.status) {
		andConditions.push({ status: query.status });
	}

	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{
					employeeId: {
						contains: query.searchTerm,
						mode: "insensitive",
					},
				},
				{
					user: {
						name: { contains: query.searchTerm, mode: "insensitive" },
					},
				},
				{
					user: {
						email: { contains: query.searchTerm, mode: "insensitive" },
					},
				},
				{
					user: {
						phone: { contains: query.searchTerm, mode: "insensitive" },
					},
				},
			],
		});
	}

	const [data, total] = await Promise.all([
		prisma.technician.findMany({
			where: { AND: andConditions },
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: includeUser,
		}),
		prisma.technician.count({ where: { AND: andConditions } }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getTechnicianById = async (id: string, user: RequestUser) => {
	const tech = await prisma.technician.findUnique({
		where: { id },
		include: includeUser,
	});

	if (!tech) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician not found");
	}

	if (user.role === UserRole.TECHNICIAN && tech.userId !== user.userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only access your own technician profile",
		);
	}

	return tech;
};

const approveTechnician = async (id: string) => {
	const tech = await prisma.technician.findUnique({
		where: { id },
		include: { user: true },
	});

	if (!tech) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Technician application not found",
		);
	}

	if (tech.applicationStatus !== TechnicianApplicationStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only pending applications can be approved",
		);
	}

	return prisma.$transaction(async (tx) => {
		const updated = await tx.technician.update({
			where: { id },
			data: { applicationStatus: TechnicianApplicationStatus.APPROVED },
			include: includeUser,
		});
		await tx.user.update({
			where: { id: tech.userId },
			data: { role: UserRole.TECHNICIAN },
		});
		return updated;
	});
};

const rejectTechnician = async (id: string, reason?: string) => {
	const tech = await prisma.technician.findUnique({ where: { id } });

	if (!tech) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Technician application not found",
		);
	}

	if (tech.applicationStatus !== TechnicianApplicationStatus.PENDING) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only pending applications can be rejected",
		);
	}

	return prisma.technician.update({
		where: { id },
		data: {
			applicationStatus: TechnicianApplicationStatus.REJECTED,
			rejectedReason: reason,
		},
		include: includeUser,
	});
};

const updateTechnician = async (
	id: string,
	payload: IUpdateTechnician,
	user: RequestUser,
) => {
	const tech = await prisma.technician.findUnique({ where: { id } });

	if (!tech) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician not found");
	}

	if (user.role === UserRole.TECHNICIAN && tech.userId !== user.userId) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only update your own technician profile",
		);
	}

	return prisma.technician.update({
		where: { id },
		data: payload,
		include: includeUser,
	});
};

const deleteTechnician = async (id: string) => {
	const tech = await prisma.technician.findUnique({
		where: { id },
		include: { user: true },
	});

	if (!tech) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician not found");
	}

	return prisma.$transaction(async (tx) => {
		await tx.technician.delete({ where: { id } });
		if (tech.user.role === UserRole.TECHNICIAN) {
			await tx.user.update({
				where: { id: tech.userId },
				data: { role: UserRole.CUSTOMER },
			});
		}
		return { message: "Technician deleted successfully" };
	});
};

export const technicianService = {
	applyAsTechnician,
	getMyApplication,
	getAllTechnicians,
	getTechnicianById,
	approveTechnician,
	rejectTechnician,
	updateTechnician,
	deleteTechnician,
};
