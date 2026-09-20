import httpStatus from "http-status";
import {
	UserRole,
	VisitStatus,
	WorkOrderStatus,
} from "../../../generated/prisma/enums";
import type { ServiceVisitWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	ICreateServiceVisit,
	IServiceVisitQuery,
	IUpdateServiceVisit,
} from "./service-visit.interface";

const include = {
	workOrder: {
		include: {
			customer: { select: { userId: true } },
		},
	},
	technician: true,
} as const;

const assertNoScheduleConflict = async (
	technicianId: string,
	start: Date,
	end: Date | null | undefined,
	excludeId?: string,
) => {
	const conflict = await prisma.serviceVisit.findFirst({
		where: {
			technicianId,
			status: { in: [VisitStatus.SCHEDULED, VisitStatus.IN_PROGRESS] },
			...(excludeId ? { NOT: { id: excludeId } } : {}),
			...(end
				? {
						scheduledStart: { lt: end },
						OR: [{ scheduledEnd: null }, { scheduledEnd: { gt: start } }],
					}
				: { scheduledStart: { equals: start } }),
		},
	});
	if (conflict)
		throw new AppError(
			httpStatus.CONFLICT,
			"This technician already has a conflicting service visit",
		);
};

const createServiceVisit = async (payload: ICreateServiceVisit) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id: payload.workOrderId },
	});
	if (!workOrder)
		throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	if (workOrder.status !== WorkOrderStatus.ASSIGNED)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only assigned work orders can be scheduled",
		);
	if (workOrder.technicianId !== payload.technicianId)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A visit can only be created for the work order's assigned technician",
		);

	await assertNoScheduleConflict(
		payload.technicianId,
		payload.scheduledStart,
		payload.scheduledEnd,
	);
	return prisma.serviceVisit.create({ data: payload, include });
};

const getAllServiceVisits = async (
	query: IServiceVisitQuery,
	user: RequestUser,
) => {
	const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
	const page = Math.max(Number(query.page) || 1, 1);
	const where: ServiceVisitWhereInput = {
		...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
		...(query.technicianId ? { technicianId: query.technicianId } : {}),
		...(query.status ? { status: query.status } : {}),
		...(user.role === UserRole.TECHNICIAN
			? { technician: { userId: user.userId } }
			: {}),
		...(user.role === UserRole.CUSTOMER
			? { workOrder: { customer: { userId: user.userId } } }
			: {}),
	};
	const [data, total] = await Promise.all([
		prisma.serviceVisit.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { scheduledStart: "asc" },
			include,
		}),
		prisma.serviceVisit.count({ where }),
	]);
	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getServiceVisitById = async (id: string, user: RequestUser) => {
	const visit = await prisma.serviceVisit.findUnique({
		where: { id },
		include,
	});
	if (!visit)
		throw new AppError(httpStatus.NOT_FOUND, "Service visit not found");
	if (
		user.role === UserRole.TECHNICIAN &&
		visit.technician.userId !== user.userId
	)
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only access your own service visits",
		);
	if (
		user.role === UserRole.CUSTOMER &&
		visit.workOrder.customer.userId !== user.userId
	)
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only access your own service visits",
		);
	return visit;
};

const updateServiceVisit = async (
	id: string,
	payload: IUpdateServiceVisit,
	user: RequestUser,
) => {
	const visit = await getServiceVisitById(id, user);
	const isTechnician = user.role === UserRole.TECHNICIAN;
	if (isTechnician && (!payload.status || Object.keys(payload).length !== 1))
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Technicians can only update a visit status",
		);

	if (payload.status && payload.status !== visit.status) {
		const permitted = isTechnician
			? (visit.status === VisitStatus.SCHEDULED &&
					payload.status === VisitStatus.IN_PROGRESS) ||
				(visit.status === VisitStatus.IN_PROGRESS &&
					payload.status === VisitStatus.COMPLETED)
			: visit.status === VisitStatus.SCHEDULED &&
				payload.status === VisitStatus.CANCELLED;
		if (!permitted)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Cannot change visit status from ${visit.status} to ${payload.status}`,
			);
	}

	if (
		!isTechnician &&
		(payload.scheduledStart || payload.scheduledEnd !== undefined)
	) {
		if (visit.status !== VisitStatus.SCHEDULED)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Only scheduled visits can be rescheduled",
			);
		const scheduledStart = payload.scheduledStart ?? visit.scheduledStart;
		const scheduledEnd =
			payload.scheduledEnd === undefined
				? visit.scheduledEnd
				: payload.scheduledEnd;
		if (scheduledEnd && scheduledEnd <= scheduledStart)
			throw new AppError(
				httpStatus.BAD_REQUEST,
				"Scheduled end must be after scheduled start",
			);
		await assertNoScheduleConflict(
			visit.technicianId,
			scheduledStart,
			scheduledEnd,
			id,
		);
	}

	const data = {
		...payload,
		...(payload.status === VisitStatus.IN_PROGRESS && !visit.actualStart
			? { actualStart: new Date() }
			: {}),
		...(payload.status === VisitStatus.COMPLETED && !visit.actualEnd
			? { actualEnd: new Date() }
			: {}),
	};

	if (payload.status === VisitStatus.COMPLETED) {
		return prisma.$transaction(async (tx) => {
			const updated = await tx.serviceVisit.update({
				where: { id },
				data,
				include,
			});
			await tx.workOrder.update({
				where: { id: visit.workOrderId },
				data: { status: WorkOrderStatus.COMPLETED, completedAt: new Date() },
			});
			return updated;
		});
	}

	return prisma.serviceVisit.update({
		where: { id },
		data,
		include,
	});
};

const deleteServiceVisit = async (id: string) => {
	const visit = await prisma.serviceVisit.findUnique({ where: { id } });
	if (!visit)
		throw new AppError(httpStatus.NOT_FOUND, "Service visit not found");
	if (
		visit.status === VisitStatus.IN_PROGRESS ||
		visit.status === VisitStatus.COMPLETED
	)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"In-progress or completed visits cannot be deleted",
		);
	await prisma.serviceVisit.delete({ where: { id } });
	return { message: "Service visit deleted successfully" };
};

export const serviceVisitService = {
	createServiceVisit,
	getAllServiceVisits,
	getServiceVisitById,
	updateServiceVisit,
	deleteServiceVisit,
};
