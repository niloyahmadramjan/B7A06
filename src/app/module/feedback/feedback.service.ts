import httpStatus from "http-status";
import {
	InvoiceStatus,
	UserRole,
	WorkOrderStatus,
} from "../../../generated/prisma/enums";
import type { FeedbackWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type { ICreateFeedback, IFeedbackQuery } from "./feedback.interface";

const include = {
	workOrder: {
		select: {
			id: true,
			workOrderNumber: true,
			title: true,
			status: true,
			technicianId: true,
		},
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
} as const;

const parseQuery = (query: IFeedbackQuery) => {
	const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
	const page = Math.max(Number(query.page) || 1, 1);
	return { limit, page };
};

const createFeedback = async (payload: ICreateFeedback, user: RequestUser) => {
	const customer = await prisma.customer.findUnique({
		where: { userId: user.userId },
	});

	if (!customer) {
		throw new AppError(httpStatus.NOT_FOUND, "Customer Profile Not Found");
	}

	const workOrder = await prisma.workOrder.findUnique({
		where: { id: payload.workOrderId },
		include: { invoice: true, feedback: true },
	});

	if (!workOrder) {
		throw new AppError(httpStatus.NOT_FOUND, "Work Order Not Found");
	}

	if (workOrder.customerId !== customer.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Can Only Review Your Own Service",
		);
	}

	if (workOrder.status !== WorkOrderStatus.COMPLETED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You Can Only Review A Completed Service",
		);
	}

	if (!workOrder.invoice || workOrder.invoice.status !== InvoiceStatus.PAID) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"You Can Only Review A Service After Its Invoice Is Paid",
		);
	}

	if (workOrder.feedback) {
		throw new AppError(
			httpStatus.CONFLICT,
			"You Have Already Reviewed This Service",
		);
	}

	return prisma.feedback.create({
		data: {
			workOrderId: workOrder.id,
			customerId: customer.id,
			technicianId: workOrder.technicianId,
			rating: payload.rating,
			comment: payload.comment,
		},
		include,
	});
};

const getAllFeedbacks = async (query: IFeedbackQuery, user: RequestUser) => {
	const { limit, page } = parseQuery(query);

	const where: FeedbackWhereInput = {
		...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
		...(query.customerId ? { customerId: query.customerId } : {}),
		...(query.technicianId ? { technicianId: query.technicianId } : {}),
		...(query.rating ? { rating: Number(query.rating) } : {}),
		...(user.role === UserRole.CUSTOMER
			? { customer: { userId: user.userId } }
			: {}),
		...(user.role === UserRole.TECHNICIAN
			? { technician: { userId: user.userId } }
			: {}),
	};

	const [data, total] = await Promise.all([
		prisma.feedback.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			include,
		}),
		prisma.feedback.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getFeedbackById = async (feedbackId: string, user: RequestUser) => {
	const feedback = await prisma.feedback.findUnique({
		where: { id: feedbackId },
		include,
	});

	if (!feedback) {
		throw new AppError(httpStatus.NOT_FOUND, "Feedback Not Found");
	}

	if (
		user.role === UserRole.CUSTOMER &&
		feedback.customer.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Can Only View Your Own Feedback",
		);
	}

	if (
		user.role === UserRole.TECHNICIAN &&
		feedback.technician?.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Can Only View Feedback About You",
		);
	}

	return feedback;
};

export const feedbackService = {
	createFeedback,
	getAllFeedbacks,
	getFeedbackById,
};
