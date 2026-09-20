import httpStatus from "http-status";
import { UserRole, WorkOrderStatus } from "../../../generated/prisma/enums";
import type { ServiceReportWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	ICreateServiceReport,
	IServiceReportQuery,
	IUpdateServiceReport,
} from "./service-report.interface";

const include = {
	workOrder: {
		select: {
			id: true,
			workOrderNumber: true,
			title: true,
			status: true,
		},
	},
	technician: {
		include: {
			user: { select: { id: true, name: true, email: true, phone: true } },
		},
	},
} as const;

const findTechnicianByUser = (userId: string) =>
	prisma.technician.findUnique({ where: { userId } });

const createServiceReport = async (
	payload: ICreateServiceReport,
	user: RequestUser,
) => {
	const technician = await findTechnicianByUser(user.userId);
	if (!technician) {
		throw new AppError(httpStatus.NOT_FOUND, "Technician Profile Not Found");
	}

	const workOrder = await prisma.workOrder.findUnique({
		where: { id: payload.workOrderId },
		include: { serviceReport: true },
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
	}

	if (workOrder.technicianId !== technician.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Can Only Report On Work Orders Assigned To You",
		);
	}

	if (workOrder.status !== WorkOrderStatus.COMPLETED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"A Service Report Can Only Be Created For Completed Work Orders",
		);
	}

	if (workOrder.serviceReport) {
		throw new AppError(
			httpStatus.CONFLICT,
			"A Service Report Already Exists For This Work Order",
		);
	}

	return prisma.serviceReport.create({
		data: {
			workOrderId: workOrder.id,
			technicianId: technician.id,
			diagnosis: payload.diagnosis,
			workPerformed: payload.workPerformed,
			notes: payload.notes,
		},
		include,
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

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getServiceReportById = async (id: string, user: RequestUser) => {
	const report = await prisma.serviceReport.findUnique({
		where: { id },
		include,
	});

	if (!report) {
		throw new AppError(httpStatus.NOT_FOUND, "Service Report Not Found");
	}

	if (
		user.role === UserRole.TECHNICIAN &&
		report.technician.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Can Only Access Your Own Service Reports",
		);
	}

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

export const serviceReportService = {
	createServiceReport,
	getAllServiceReports,
	getServiceReportById,
	updateServiceReport,
};
