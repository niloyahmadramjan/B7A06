import httpStatus from "http-status";
import {
	AssignmentStatus,
	InvoiceStatus,
	PaymentStatus,
	ServiceRequestStatus,
	WorkOrderStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";

const startOfToday = () => {
	const start = new Date();
	start.setHours(0, 0, 0, 0);
	return start;
};

const startOfTomorrow = () => {
	const end = new Date();
	end.setHours(24, 0, 0, 0);
	return end;
};

const getStaffStats = async () => {
	const [
		totalCustomers,
		totalTechnicians,
		totalServices,
		totalRequests,
		pendingRequests,
		totalWorkOrders,
		completedWorkOrders,
		revenue,
	] = await Promise.all([
		prisma.customer.count(),
		prisma.technician.count(),
		prisma.service.count(),
		prisma.serviceRequest.count({ where: { deletedAt: null } }),
		prisma.serviceRequest.count({
			where: { deletedAt: null, status: ServiceRequestStatus.PENDING },
		}),
		prisma.workOrder.count(),
		prisma.workOrder.count({ where: { status: WorkOrderStatus.COMPLETED } }),
		prisma.payment.aggregate({
			where: { status: PaymentStatus.SUCCESS },
			_sum: { amount: true },
		}),
	]);

	return {
		totalCustomers,
		totalTechnicians,
		totalServices,
		totalServiceRequests: totalRequests,
		pendingRequests,
		totalWorkOrders,
		totalCompletedOrders: completedWorkOrders,
		totalRevenue: revenue._sum.amount ?? 0,
	};
};

const getTechnicianStats = async (userId: string) => {
	const technician = await prisma.technician.findUnique({
		where: { userId },
	});
	if (!technician)
		throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");

	const [
		assignedWorkOrders,
		pendingAssignments,
		todaysVisits,
		completedWorkOrders,
	] = await Promise.all([
		prisma.workOrder.count({ where: { technicianId: technician.id } }),
		prisma.technicianAssignment.count({
			where: {
				technicianId: technician.id,
				status: AssignmentStatus.PENDING,
			},
		}),
		prisma.serviceVisit.count({
			where: {
				technicianId: technician.id,
				scheduledStart: { gte: startOfToday(), lt: startOfTomorrow() },
			},
		}),
		prisma.workOrder.count({
			where: {
				technicianId: technician.id,
				status: WorkOrderStatus.COMPLETED,
			},
		}),
	]);

	return {
		assignedWorkOrders,
		pendingAssignments,
		todaysVisits,
		completedWorkOrders,
	};
};

const getCustomerStats = async (userId: string) => {
	const customer = await prisma.customer.findUnique({ where: { userId } });
	if (!customer)
		throw new AppError(httpStatus.NOT_FOUND, "Customer profile not found");

	const [
		totalRequests,
		pendingRequests,
		activeWorkOrders,
		completedWorkOrders,
		totalInvoices,
		paidInvoices,
	] = await Promise.all([
		prisma.serviceRequest.count({
			where: { customerId: customer.id, deletedAt: null },
		}),
		prisma.serviceRequest.count({
			where: {
				customerId: customer.id,
				deletedAt: null,
				status: ServiceRequestStatus.PENDING,
			},
		}),
		prisma.workOrder.count({
			where: {
				customerId: customer.id,
				status: {
					notIn: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
				},
			},
		}),
		prisma.workOrder.count({
			where: {
				customerId: customer.id,
				status: WorkOrderStatus.COMPLETED,
			},
		}),
		prisma.invoice.count({ where: { customerId: customer.id } }),
		prisma.invoice.count({
			where: { customerId: customer.id, status: InvoiceStatus.PAID },
		}),
	]);

	return {
		myServiceRequests: totalRequests,
		pendingRequests,
		activeWorkOrders,
		completedServices: completedWorkOrders,
		totalInvoices,
		paidInvoices,
	};
};

export const dashboardService = {
	getStaffStats,
	getTechnicianStats,
	getCustomerStats,
};
