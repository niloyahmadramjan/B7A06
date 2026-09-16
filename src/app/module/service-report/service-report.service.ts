import httpStatus from "http-status";
import type { ServiceReportWhereInput } from "../../../generated/prisma/models";
import { UserRole, WorkOrderStatus } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	ICreateServiceReport,
	IServiceReportQuery,
	IUpdateServiceReport,
} from "./service-report.interface";

const include = {
	workOrder: true,
	technician: { include: { user: true } },
} as const;

const createServiceReport = async (
	payload: ICreateServiceReport,
	user: RequestUser,
) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id: payload.workOrderId },
	});
	if (!workOrder) throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	if (
		workOrder.status === WorkOrderStatus.CREATED ||
		workOrder.status === WorkOrderStatus.COMPLETED ||
		workOrder.status === WorkOrderStatus.CANCELLED
	)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Service reports can only be created for ${WorkOrderStatus.ASSIGNED} or ${WorkOrderStatus.IN_PROGRESS} work orders`,
		);
	if (workOrder.technicianId !== payload.technicianId)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A report can only be created for the work order's assigned technician",
		);

	const technician = await prisma.technician.findUnique({
		where: { id: payload.technicianId },
	});
	if (!technician) throw new AppError(httpStatus.NOT_FOUND, "Technician not found");
	if (user.role === UserRole.TECHNICIAN && technician.userId !== user.userId)
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only create reports for your own work orders",
		);

	const existing = await prisma.serviceReport.findUnique({
		where: { workOrderId: payload.workOrderId },
	});
	if (existing)
		throw new AppError(
			httpStatus.CONFLICT,
			"A service report already exists for this work order",
		);

	return prisma.$transaction(async (tx) => {
		const report = await tx.serviceReport.create({
			data: payload,
			include,
		});
		await tx.workOrder.update({
			where: { id: payload.workOrderId },
			data: {
				status: WorkOrderStatus.COMPLETED,
				completedAt: new Date(),
			},
		});
		return report;
	});
};

const getAllServiceReports = async (
	query: IServiceReportQuery,
	user: RequestUser,
) => {
	const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
	const page = Math.max(Number(query.page) || 1, 1);
	const where: ServiceReportWhereInput = {
		...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
		...(query.technicianId ? { technicianId: query.technicianId } : {}),
		...(user.role === UserRole.TECHNICIAN
			? { technician: { userId: user.userId } }
			: {}),
	};
	const [data, total] = await Promise.all([
		prisma.serviceReport.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			include,
		}),
		prisma.serviceReport.count({ where }),
	]);
	return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getServiceReportById = async (id: string, user: RequestUser) => {
	const report = await prisma.serviceReport.findUnique({
		where: { id },
		include,
	});
	if (!report) throw new AppError(httpStatus.NOT_FOUND, "Service report not found");
	if (user.role === UserRole.TECHNICIAN && report.technician.userId !== user.userId)
		throw new AppError(httpStatus.FORBIDDEN, "You can only access your own service reports");
	return report;
};

const updateServiceReport = async (
	id: string,
	payload: IUpdateServiceReport,
	user: RequestUser,
) => {
	await getServiceReportById(id, user);
	return prisma.serviceReport.update({
		where: { id },
		data: payload,
		include,
	});
};

const deleteServiceReport = async (id: string) => {
	const report = await prisma.serviceReport.findUnique({ where: { id } });
	if (!report) throw new AppError(httpStatus.NOT_FOUND, "Service report not found");
	await prisma.serviceReport.delete({ where: { id } });
	return { message: "Service report deleted successfully" };
};

export const serviceReportService = {
	createServiceReport,
	getAllServiceReports,
	getServiceReportById,
	updateServiceReport,
	deleteServiceReport,
};