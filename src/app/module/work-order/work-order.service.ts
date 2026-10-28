import httpStatus from "http-status";
import { UserRole, WorkOrderStatus } from "../../../generated/prisma/enums";
import type { WorkOrderWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import type {
	IUpdateWorkOrderStatus,
	IWorkOrderQuery,
} from "./work-order.interface";

const include = {
	request: {
		include: { service: true },
	},
	customer: {
		include: {
			user: { select: { id: true, name: true, email: true, phone: true } },
		},
	},
	technician: {
		include: {
			user: { select: { id: true, name: true, email: true, phone: true } },
		},
	},
	assignments: true,
	visits: true,
	serviceReport: true,
	invoice: true,
	feedback: true,
} as const;

const parseQuery = (query: IWorkOrderQuery) => {
	const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
	const page = Math.max(Number(query.page) || 1, 1);
	const sortBy = query.sortBy ?? "createdAt";
	const sortOrder: "asc" | "desc" = query.sortOrder === "asc" ? "asc" : "desc";
	return { limit, page, sortBy, sortOrder };
};

const getAllWorkOrders = async (query: IWorkOrderQuery, user: RequestUser) => {
	const { limit, page, sortBy, sortOrder } = parseQuery(query);
	const term = query.searchTerm;

	const where: WorkOrderWhereInput = {
		...(query.status ? { status: query.status } : {}),
		...(query.customerId ? { customerId: query.customerId } : {}),
		...(query.technicianId ? { technicianId: query.technicianId } : {}),
		...(term
			? {
					OR: [
						{ workOrderNumber: { contains: term, mode: "insensitive" } },
						{ title: { contains: term, mode: "insensitive" } },
					],
				}
			: {}),
		...(user.role === UserRole.CUSTOMER
			? { customer: { userId: user.userId } }
			: {}),
		...(user.role === UserRole.TECHNICIAN
			? { technician: { userId: user.userId } }
			: {}),
	};

	const [data, total] = await Promise.all([
		prisma.workOrder.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
			include,
		}),
		prisma.workOrder.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getWorkOrderById = async (id: string, user: RequestUser) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id },
		include,
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
	}

	if (
		user.role === UserRole.CUSTOMER &&
		workOrder.customer.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Can Only Access Your Own Work Orders",
		);
	}

	if (
		user.role === UserRole.TECHNICIAN &&
		workOrder.technician?.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Can Only Access Work Orders Assigned To You",
		);
	}

	return workOrder;
};

// const updateWorkOrderStatus = async (
// 	id: string,
// 	payload: IUpdateWorkOrderStatus,
// 	user: RequestUser,
// ) => {
// 	const workOrder = await prisma.workOrder.findUnique({ where: { id } });

// 	if (!workOrder) {
// 		throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
// 	}

// 	if (payload.status === workOrder.status) {
// 		return workOrder;
// 	}

// 	const permitted =
// 		payload.status === WorkOrderStatus.CANCELLED &&
// 		workOrder.status === WorkOrderStatus.CREATED;

// 	if (!permitted) {
// 		throw new AppError(
// 			httpStatus.BAD_REQUEST,
// 			`Cannot change work order status from ${workOrder.status} to ${payload.status}`,
// 		);
// 	}

// 	const updated = await prisma.workOrder.update({
// 		where: { id },
// 		data: { status: payload.status },
// 		include,
// 	});

// 	await recordAuditLog({
// 		actorId: user.userId,
// 		action: payload.status,
// 		entity: "WorkOrder",
// 		entityId: id,
// 	});

// 	return updated;
// };

const updateWorkOrderStatus = async (
	id: string,
	payload: IUpdateWorkOrderStatus,
	user: RequestUser,
) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id },
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
	}

	// Terminal statuses
	const terminalStatuses: WorkOrderStatus[] = [
		WorkOrderStatus.CANCELLED,
		WorkOrderStatus.COMPLETED,
	];

	// Cannot change once cancelled or completed
	if (terminalStatuses.includes(workOrder.status)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot update work order. Status is already ${workOrder.status}`,
		);
	}

	// No change needed
	if (payload.status === workOrder.status) {
		return workOrder;
	}

	// All other status transitions are allowed
	const updated = await prisma.workOrder.update({
		where: { id },
		data: {
			status: payload.status,
		},
		include,
	});

	await recordAuditLog({
		actorId: user.userId,
		action: payload.status,
		entity: "WorkOrder",
		entityId: id,
	});

	return updated;
};

const getTechnicianWorkOrders = async (
	query: IWorkOrderQuery,
	user: RequestUser,
) => {
	// 1. Check technician role
	if (user.role !== UserRole.TECHNICIAN) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"Only technicians can access their work orders",
		);
	}

	// 2. Find logged-in technician
	const technician = await prisma.technician.findUnique({
		where: {
			userId: user.userId,
		},
	});

	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
	}

	// 3. Pagination and sorting
	const { limit, page, sortBy, sortOrder } = parseQuery(query);

	const term = query.searchTerm?.trim();

	// 4. Filter only this technician's work orders
	const where: WorkOrderWhereInput = {
		technicianId: technician.id,

		...(query.status ? { status: query.status } : {}),

		...(term
			? {
					OR: [
						{
							workOrderNumber: {
								contains: term,
								mode: "insensitive",
							},
						},
						{
							title: {
								contains: term,
								mode: "insensitive",
							},
						},
					],
				}
			: {}),
	};

	// 5. Fetch work orders and total count
	const [data, total] = await Promise.all([
		prisma.workOrder.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: {
				[sortBy]: sortOrder,
			},
			include,
		}),

		prisma.workOrder.count({
			where,
		}),
	]);

	// 6. Return result
	return {
		data,
		meta: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit),
		},
	};
};

export const workOrderService = {
	getAllWorkOrders,
	getWorkOrderById,
	updateWorkOrderStatus,
	getTechnicianWorkOrders,
};
