import crypto from "node:crypto";
import httpStatus from "http-status";
import type { InvoiceWhereInput } from "../../../generated/prisma/models";
import {
	InvoiceStatus,
	UserRole,
	WorkOrderStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	ICreateInvoice,
	IInvoiceQuery,
	IUpdateInvoice,
} from "./invoice.interface";

const include = { workOrder: true, customer: true } as const;

const createInvoice = async (payload: ICreateInvoice) => {
	if (
		payload.status &&
		payload.status !== InvoiceStatus.DRAFT &&
		payload.status !== InvoiceStatus.ISSUED
	)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invoices can only be created as DRAFT or ISSUED",
		);

	const workOrder = await prisma.workOrder.findUnique({
		where: { id: payload.workOrderId },
		include: { request: { include: { service: true } } },
	});
	if (!workOrder) throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	if (workOrder.status !== WorkOrderStatus.COMPLETED)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invoices can only be created for completed work orders",
		);
	if (payload.customerId && payload.customerId !== workOrder.customerId)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"customerId does not match the work order's customer",
		);

	const existing = await prisma.invoice.findUnique({
		where: { workOrderId: payload.workOrderId },
	});
	if (existing)
		throw new AppError(
			httpStatus.CONFLICT,
			"An invoice already exists for this work order",
		);

	const servicePrice = Number(workOrder.request.service.price);
	const additionalCost = Number(
		workOrder.actualCost ?? workOrder.estimatedCost ?? 0,
	);
	const amount = payload.amount ?? String(servicePrice + additionalCost);
	const issuedAt =
		payload.status === InvoiceStatus.ISSUED
			? (payload.issuedAt ?? new Date())
			: payload.issuedAt;

	return prisma.invoice.create({
		data: {
			invoiceNumber: `INV-${Date.now()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`,
			workOrderId: payload.workOrderId,
			customerId: workOrder.customerId,
			amount,
			...(payload.status ? { status: payload.status } : {}),
			...(issuedAt ? { issuedAt } : {}),
			...(payload.dueDate ? { dueDate: payload.dueDate } : {}),
		},
		include,
	});
};

const getAllInvoices = async (query: IInvoiceQuery, user: RequestUser) => {
	const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
	const page = Math.max(Number(query.page) || 1, 1);
	const where: InvoiceWhereInput = {
		...(query.status ? { status: query.status } : {}),
		...(query.customerId ? { customerId: query.customerId } : {}),
		...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
		...(user.role === UserRole.CUSTOMER
			? { customer: { userId: user.userId } }
			: {}),
	};
	const [data, total] = await Promise.all([
		prisma.invoice.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			include,
		}),
		prisma.invoice.count({ where }),
	]);
	return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const getInvoiceById = async (id: string, user: RequestUser) => {
	const invoice = await prisma.invoice.findUnique({ where: { id }, include });
	if (!invoice) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
	if (user.role === UserRole.CUSTOMER && invoice.customer.userId !== user.userId)
		throw new AppError(httpStatus.FORBIDDEN, "You can only access your own invoices");
	return invoice;
};

const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
	DRAFT: [InvoiceStatus.ISSUED, InvoiceStatus.CANCELLED],
	ISSUED: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED],
	PAID: [],
	CANCELLED: [],
};

const updateInvoice = async (
	id: string,
	payload: IUpdateInvoice,
	user: RequestUser,
) => {
	const invoice = await getInvoiceById(id, user);
	if (payload.status && payload.status !== invoice.status) {
		if (!allowedTransitions[invoice.status].includes(payload.status))
			throw new AppError(
				httpStatus.BAD_REQUEST,
				`Cannot change invoice status from ${invoice.status} to ${payload.status}`,
			);
	}

	return prisma.invoice.update({
		where: { id },
		data: {
			...payload,
			...(payload.status === InvoiceStatus.ISSUED && !invoice.issuedAt
				? { issuedAt: new Date() }
				: {}),
		},
		include,
	});
};

const deleteInvoice = async (id: string) => {
	const invoice = await prisma.invoice.findUnique({ where: { id } });
	if (!invoice) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
	if (invoice.status === InvoiceStatus.PAID)
		throw new AppError(httpStatus.BAD_REQUEST, "Paid invoices cannot be deleted");
	await prisma.invoice.delete({ where: { id } });
	return { message: "Invoice deleted successfully" };
};

export const invoiceService = {
	createInvoice,
	getAllInvoices,
	getInvoiceById,
	updateInvoice,
	deleteInvoice,
};