import httpStatus from "http-status";
import {
	InvoiceStatus,
	PaymentStatus,
	ServiceRequestStatus,
	WorkOrderStatus,
} from "../../../generated/prisma/enums";
import type {
	AuditLogWhereInput,
	UserWhereInput,
} from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { recordAuditLog } from "../../utils/auditLog";
import type { IAdminUserQuery, IAuditLogQuery } from "./admin.interface";

const parsePagination = (page?: string, limit?: string) => {
	const size = Math.min(Math.max(Number(limit) || 10, 1), 100);
	const current = Math.max(Number(page) || 1, 1);
	return { limit: size, page: current };
};

const getAllUsers = async (query: IAdminUserQuery) => {
	const { limit, page } = parsePagination(query.page, query.limit);
	const term = query.searchTerm;

	const where: UserWhereInput = {
		...(query.role ? { role: query.role } : {}),
		...(query.status ? { status: query.status } : {}),
		...(term
			? {
					OR: [
						{ name: { contains: term, mode: "insensitive" } },
						{ email: { contains: term, mode: "insensitive" } },
						{ phone: { contains: term, mode: "insensitive" } },
					],
				}
			: {}),
	};

	const [data, total] = await Promise.all([
		prisma.user.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			omit: { passwordHash: true },
			include: { customer: true, technician: true },
		}),
		prisma.user.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const updateUserRole = async (
	userId: string,
	role: RequestUser["role"],
	actor: RequestUser,
) => {
	if (userId === actor.userId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You Cannot Change Your Own Role",
		);
	}

	const target = await prisma.user.findUnique({
		where: { id: userId },
		omit: { passwordHash: true },
	});

	if (!target) {
		throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
	}

	const updated = await prisma.user.update({
		where: { id: userId },
		data: { role },
		omit: { passwordHash: true },
	});

	await recordAuditLog({
		actorId: actor.userId,
		action: "UPDATE_ROLE",
		entity: "User",
		entityId: userId,
		changes: { from: target.role, to: role },
	});

	return updated;
};

const getDashboardStats = async () => {
	const [
		totalUsers,
		totalCustomers,
		totalTechnicians,
		totalRequests,
		pendingRequests,
		totalWorkOrders,
		completedWorkOrders,
		totalInvoices,
		paidInvoices,
		totalPayments,
		successfulPayments,
		totalFeedbacks,
		revenue,
		rating,
	] = await Promise.all([
		prisma.user.count(),
		prisma.customer.count(),
		prisma.technician.count(),
		prisma.serviceRequest.count({ where: { deletedAt: null } }),
		prisma.serviceRequest.count({
			where: { deletedAt: null, status: ServiceRequestStatus.PENDING },
		}),
		prisma.workOrder.count(),
		prisma.workOrder.count({ where: { status: WorkOrderStatus.COMPLETED } }),
		prisma.invoice.count(),
		prisma.invoice.count({ where: { status: InvoiceStatus.PAID } }),
		prisma.payment.count(),
		prisma.payment.count({ where: { status: PaymentStatus.SUCCESS } }),
		prisma.feedback.count(),
		prisma.payment.aggregate({
			where: { status: PaymentStatus.SUCCESS },
			_sum: { amount: true },
		}),
		prisma.feedback.aggregate({ _avg: { rating: true } }),
	]);

	return {
		users: {
			total: totalUsers,
			customers: totalCustomers,
			technicians: totalTechnicians,
		},
		requests: { total: totalRequests, pending: pendingRequests },
		workOrders: { total: totalWorkOrders, completed: completedWorkOrders },
		invoices: { total: totalInvoices, paid: paidInvoices },
		payments: {
			total: totalPayments,
			successful: successfulPayments,
			revenue: revenue._sum.amount ?? 0,
		},
		feedbacks: {
			total: totalFeedbacks,
			averageRating: rating._avg.rating ?? 0,
		},
	};
};

const getAuditLogs = async (query: IAuditLogQuery) => {
	const { limit, page } = parsePagination(query.page, query.limit);

	const where: AuditLogWhereInput = {
		...(query.entity ? { entity: query.entity } : {}),
		...(query.action ? { action: query.action } : {}),
		...(query.actorId ? { actorId: query.actorId } : {}),
		...(query.entityId ? { entityId: query.entityId } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			include: {
				actor: {
					select: {
						id: true,
						name: true,
						email: true,
						phone: true,
						role: true,
					},
				},
			},
		}),
		prisma.auditLog.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

export const adminService = {
	getAllUsers,
	updateUserRole,
	getDashboardStats,
	getAuditLogs,
};
