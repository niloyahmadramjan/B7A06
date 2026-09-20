import httpStatus from "http-status";
import {
	AssignmentStatus,
	TechnicianStatus,
	UserRole,
	WorkOrderStatus,
} from "../../../generated/prisma/enums";
import type { TechnicianAssignmentWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	IAssignmentQuery,
	ICreateAssignment,
} from "./assignment.interface";

const include = {
	workOrder: true,
	technician: true,
	assignedBy: true,
} as const;

const createAssignment = async (p: ICreateAssignment, user: RequestUser) => {
	const wo = await prisma.workOrder.findUnique({
		where: { id: p.workOrderId },
	});
	if (!wo) throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	if (wo.status !== WorkOrderStatus.CREATED)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only unassigned work orders can be assigned",
		);
	const tech = await prisma.technician.findUnique({
		where: { id: p.technicianId },
	});
	if (!tech) throw new AppError(httpStatus.NOT_FOUND, "Technician not found");
	if (tech.status === TechnicianStatus.OFFLINE)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Offline technicians cannot be assigned",
		);
	const active = await prisma.technicianAssignment.findFirst({
		where: {
			workOrderId: p.workOrderId,
			status: AssignmentStatus.ACCEPTED,
		},
	});
	if (active)
		throw new AppError(
			httpStatus.CONFLICT,
			"This work order is already assigned to a technician",
		);
	return prisma.technicianAssignment.create({
		data: {
			...p,
			assignedById: user.userId,
			status: AssignmentStatus.PENDING,
		},
		include,
	});
};

const respondToAssignment = async (
	id: string,
	accepted: boolean,
	user: RequestUser,
) => {
	const assignment = await prisma.technicianAssignment.findUnique({
		where: { id },
		include: { technician: true, workOrder: true },
	});
	if (!assignment)
		throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	if (assignment.technician.userId !== user.userId)
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only respond to your own assignments",
		);
	if (assignment.status !== AssignmentStatus.PENDING)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This assignment has already been responded to",
		);

	return prisma.$transaction(
		async (tx) => {
			if (accepted) {
				if (assignment.workOrder.status !== WorkOrderStatus.CREATED)
					throw new AppError(
						httpStatus.CONFLICT,
						"This work order is no longer available for assignment",
					);
				await tx.technicianAssignment.updateMany({
					where: {
						workOrderId: assignment.workOrderId,
						status: AssignmentStatus.PENDING,
					},
					data: {
						status: AssignmentStatus.REJECTED,
						respondedAt: new Date(),
					},
				});
				await tx.workOrder.update({
					where: { id: assignment.workOrderId },
					data: {
						status: WorkOrderStatus.ASSIGNED,
						technicianId: assignment.technicianId,
					},
				});
			}
			return tx.technicianAssignment.update({
				where: { id },
				data: {
					status: accepted
						? AssignmentStatus.ACCEPTED
						: AssignmentStatus.REJECTED,
					respondedAt: new Date(),
				},
				include,
			});
		},
		{ maxWait: 10000, timeout: 20000 },
	);
};

const getAllAssignments = async (q: IAssignmentQuery, user: RequestUser) => {
	const limit = Math.min(Math.max(Number(q.limit) || 10, 1), 100),
		page = Math.max(Number(q.page) || 1, 1);
	const where: TechnicianAssignmentWhereInput = {
		...(q.status ? { status: q.status } : {}),
		...(q.workOrderId ? { workOrderId: q.workOrderId } : {}),
		...(q.technicianId ? { technicianId: q.technicianId } : {}),
		...(user.role === UserRole.TECHNICIAN
			? { technician: { userId: user.userId } }
			: {}),
	};
	const [data, total] = await Promise.all([
		prisma.technicianAssignment.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { assignedAt: "desc" },
			include,
		}),
		prisma.technicianAssignment.count({ where }),
	]);
	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getAssignmentById = async (id: string, user: RequestUser) => {
	const a = await prisma.technicianAssignment.findUnique({
		where: { id },
		include,
	});
	if (!a) throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	if (user.role === UserRole.TECHNICIAN && a.technician.userId !== user.userId)
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only access your own assignments",
		);
	return a;
};

const deleteAssignment = async (id: string) => {
	const a = await prisma.technicianAssignment.findUnique({
		where: { id },
		include: { workOrder: true },
	});
	if (!a) throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
	if (
		a.status === AssignmentStatus.ACCEPTED &&
		(a.workOrder.status === WorkOrderStatus.IN_PROGRESS ||
			a.workOrder.status === WorkOrderStatus.COMPLETED ||
			a.workOrder.status === WorkOrderStatus.CANCELLED)
	)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"The assignment cannot be removed once work has started",
		);
	return prisma.$transaction(async (tx) => {
		await tx.technicianAssignment.delete({ where: { id } });
		await tx.workOrder.updateMany({
			where: { id: a.workOrderId, technicianId: a.technicianId },
			data: { status: WorkOrderStatus.CREATED, technicianId: null },
		});
		return { message: "Assignment deleted successfully" };
	});
};
export const assignmentService = {
	createAssignment,
	getAllAssignments,
	getAssignmentById,
	respondToAssignment,
	deleteAssignment,
};
