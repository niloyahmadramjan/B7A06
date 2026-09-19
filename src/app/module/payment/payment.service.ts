import crypto from "node:crypto";
import httpStatus from "http-status";
import {
	InvoiceStatus,
	PaymentMethod,
	PaymentStatus,
	UserRole,
} from "../../../generated/prisma/enums";
import type { PaymentWhereInput } from "../../../generated/prisma/models";
import config from "../../config";
import { getBkashIdToken } from "../../lib/bkash";
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

const getInvoiceForPayment = async (invoiceId: string, user: RequestUser) => {
	const invoice = await prisma.invoice.findUnique({
		where: { id: invoiceId },
		include: { customer: true },
	});

	if (!invoice) {
		throw new AppError(httpStatus.NOT_FOUND, "Invoice Not Found");
	}

	if (
		user.role === UserRole.CUSTOMER &&
		invoice.customer.userId !== user.userId
	) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You Are Not Allowed To Pay This Invoice",
		);
	}

	if (invoice.status === InvoiceStatus.PAID) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invoice Is Already Paid");
	}

	if (invoice.status !== InvoiceStatus.ISSUED) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Only Issued Invoices Can Be Paid",
		);
	}

	return invoice;
};

const payInvoice = async (invoiceId: string, user: RequestUser) => {
	const invoice = await getInvoiceForPayment(invoiceId, user);

	// expire stale pending sessions so a fresh bKash payment is always created
	await prisma.payment.updateMany({
		where: { invoiceId: invoice.id, status: PaymentStatus.PENDING },
		data: { status: PaymentStatus.FAILED },
	});

	const bkashIdToken = await getBkashIdToken();

	if (!bkashIdToken) {
		throw new AppError(httpStatus.BAD_GATEWAY, "No bKash ID Token");
	}

	const merchantInvoiceNumber = `${invoice.invoiceNumber}-${crypto
		.randomBytes(3)
		.toString("hex")
		.toUpperCase()}`;

	const createResponse = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/create`,
		{
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json",
				Authorization: bkashIdToken,
				"X-APP-Key": config.bkash_app_key,
			},
			body: JSON.stringify({
				mode: "0011",
				payerReference: user.email,
				callbackURL: `${config.bkase_call_back_url}/api/v1/payments/callback`,
				amount: invoice.amount.toString(),
				currency: "BDT",
				intent: "sale",
				merchantInvoiceNumber,
			}),
		},
	);

	const gatewayResponse = await createResponse.json();

	if (!createResponse.ok || !gatewayResponse.bkashURL) {
		throw new AppError(
			httpStatus.BAD_GATEWAY,
			gatewayResponse?.statusMessage || "Failed To Initiate bKash Payment",
		);
	}

	const payment = await prisma.payment.create({
		data: {
			invoiceId: invoice.id,
			amount: invoice.amount,
			method: PaymentMethod.BKASH,
			status: PaymentStatus.PENDING,
			merchantInvoiceNumber,
			gatewayPaymentId: gatewayResponse.paymentID,
			gatewayResponse,
		},
	});

	return {
		paymentId: payment.id,
		paymentUrl: gatewayResponse.bkashURL,
	};
};

const paymentCallback = async (query: Record<string, any>) => {
	const gatewayPaymentId = query.paymentID;
	const status = (query.status as string)?.toLowerCase();

	if (!gatewayPaymentId) {
		throw new AppError(httpStatus.BAD_REQUEST, "Payment ID Is Missing");
	}

	if (!status) {
		throw new AppError(httpStatus.BAD_REQUEST, "Payment Status Is Missing");
	}

	const payment = await prisma.payment.findUnique({
		where: { gatewayPaymentId },
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment Not Found");
	}

	if (status === "success") {
		const bkashIdToken = await getBkashIdToken();

		if (!bkashIdToken) {
			throw new AppError(httpStatus.BAD_GATEWAY, "No bKash ID Token");
		}

		const executeResponse = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/execute`,
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json",
					Authorization: bkashIdToken,
					"X-APP-Key": config.bkash_app_key,
				},
				body: JSON.stringify({ paymentID: gatewayPaymentId }),
			},
		);

		const executedPaymentResult = await executeResponse.json();

		if (!executeResponse.ok || executedPaymentResult?.statusCode !== "0000") {
			throw new AppError(
				httpStatus.BAD_GATEWAY,
				executedPaymentResult?.statusMessage ||
					"Failed To Execute bKash Payment",
			);
		}

		await prisma.$transaction([
			prisma.payment.update({
				where: { id: payment.id },
				data: {
					status: PaymentStatus.SUCCESS,
					transactionId: executedPaymentResult.trxID,
					paidAt: new Date(executedPaymentResult.paymentExecuteTime),
					gatewayResponse: executedPaymentResult,
				},
			}),
			prisma.invoice.update({
				where: { id: payment.invoiceId },
				data: { status: InvoiceStatus.PAID },
			}),
		]);

		return {
			redirectUrl: `${config.frontend_url}/dashboard/invoices?payment=success`,
		};
	}

	if (status === "failure" || status === "cancel") {
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: PaymentStatus.FAILED,
				gatewayResponse: query,
			},
		});

		return {
			redirectUrl: `${config.frontend_url}/dashboard/invoices?payment=${status}`,
		};
	}

	return {
		redirectUrl: `${config.frontend_url}/dashboard/invoices`,
	};
};

export const PaymentServices = {
	getAllPayments,
	getMyPayments,
	getSinglePayment,
	payInvoice,
	paymentCallback,
};
