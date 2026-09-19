import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import type { PaymentWhereInput } from "../../../generated/prisma/models";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type { IPaymentQuery } from "./payment.interface";

const include = {
	invoice: {
		include: {
			customer: {
				include: {
					user: { select: { id: true, name: true, email: true, phone: true } },
				},
			},
			workOrder: true,
		},
	},
} as const;

const parseQuery = (query: IPaymentQuery) => {
	const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
	const page = Math.max(Number(query.page) || 1, 1);
	const sortBy = (query.sortBy as string) ?? "createdAt";
	const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
	return { limit, page, sortBy, sortOrder };
};

const getMyPayments = async (query: IPaymentQuery, user: RequestUser) => {
	const { limit, page, sortBy, sortOrder } = parseQuery(query);

	const customer = await prisma.customer.findUnique({
		where: { userId: user.userId },
	});

	if (!customer) {
		throw new AppError(httpStatus.NOT_FOUND, "Customer Profile Not Found");
	}

	const where: PaymentWhereInput = {
		invoice: { customerId: customer.id },
		...(query.status ? { status: query.status } : {}),
		...(query.method ? { method: query.method } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.payment.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
			include,
		}),
		prisma.payment.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getAllPayments = async (query: IPaymentQuery) => {
	const { limit, page, sortBy, sortOrder } = parseQuery(query);

	const where: PaymentWhereInput = {
		...(query.status ? { status: query.status } : {}),
		...(query.method ? { method: query.method } : {}),
		...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
		...(query.customerId ? { invoice: { customerId: query.customerId } } : {}),
	};

	const [data, total] = await Promise.all([
		prisma.payment.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { [sortBy]: sortOrder },
			include,
		}),
		prisma.payment.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getSinglePayment = async (paymentId: string, user: RequestUser) => {
	const payment = await prisma.payment.findUnique({
		where: { id: paymentId },
		include,
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment Not Found");
	}

	if (
		user.role === UserRole.CUSTOMER &&
		payment.invoice.customer.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Are Not Allowed To View This Payment",
		);
	}

	return payment;
};

export const PaymentServices = {
	getAllPayments,
	getMyPayments,
	getSinglePayment,
};
