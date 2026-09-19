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
	ICreateInvoiceItem,
	IInvoiceQuery,
	IUpdateInvoice,
} from "./invoice.interface";

const include = {
	workOrder: true,
	customer: true,
	items: {
		include: {
			addedBy: {
				select: { id: true, name: true, email: true, role: true },
			},
		},
		orderBy: { createdAt: "desc" },
	},
} as const;

const resolveWorkOrderForInvoice = async (workOrderId: string) => {
	const workOrder = await prisma.workOrder.findUnique({
		where: { id: workOrderId },
		include: { request: { include: { service: true } } },
	});
	if (!workOrder)
		throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
	return workOrder;
};

const createInvoice = async (payload: ICreateInvoice, user: RequestUser) => {
	if (
		payload.status &&
		payload.status !== InvoiceStatus.DRAFT &&
		payload.status !== InvoiceStatus.ISSUED
	)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Invoices can only be created as DRAFT or ISSUED",
		);

	const workOrder = await resolveWorkOrderForInvoice(payload.workOrderId);
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
	const base = servicePrice + additionalCost;
	const itemSum = (payload.items ?? []).reduce(
		(sum, item) => sum + Number(item.amount),
		0,
	);
	const amount = payload.amount ?? String(base + itemSum);
	const issuedAt =
		payload.status === InvoiceStatus.ISSUED
			? (payload.issuedAt ?? new Date())
			: payload.issuedAt;

	return prisma.$transaction(async (tx) => {
		const invoice = await tx.invoice.create({
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

		if (payload.items?.length) {
			await tx.invoiceItem.createMany({
				data: payload.items.map((item) => ({
					invoiceId: invoice.id,
					title: item.title,
					category: item.category ?? "OTHER",
					amount: item.amount,
					addedById: user.userId,
				})),
			});
		}

		return tx.invoice.findUniqueOrThrow({
			where: { id: invoice.id },
			include,
		});
	});
};

const addInvoiceItem = async (
	invoiceId: string,
	payload: ICreateInvoiceItem,
	user: RequestUser,
) => {
	const invoice = await prisma.invoice.findUnique({
		where: { id: invoiceId },
		include: { workOrder: true },
	});
	if (!invoice) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");

	if (
		invoice.status === InvoiceStatus.PAID ||
		invoice.status === InvoiceStatus.CANCELLED
	)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Additional costs can only be added while the invoice is DRAFT or ISSUED",
		);

	if (user.role === UserRole.TECHNICIAN) {
		const technician = await prisma.technician.findUnique({
			where: { userId: user.userId },
		});
		if (!technician)
			throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
		if (invoice.workOrder.technicianId !== technician.id)
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You can only add costs to work orders assigned to you",
			);
	}

	const newAmount = Number(invoice.amount) + Number(payload.amount);

	return prisma.$transaction(async (tx) => {
		await tx.invoiceItem.create({
			data: {
				invoiceId,
				title: payload.title,
				category: payload.category ?? "OTHER",
				amount: payload.amount,
				addedById: user.userId,
			},
		});

		await tx.invoice.update({
			where: { id: invoiceId },
			data: { amount: String(newAmount) },
		});

		return tx.invoice.findUniqueOrThrow({
			where: { id: invoiceId },
			include,
		});
	});
};

const deleteInvoiceItem = async (
	invoiceId: string,
	itemId: string,
	user: RequestUser,
) => {
	const invoice = await prisma.invoice.findUnique({
		where: { id: invoiceId },
		include: { items: true, workOrder: true },
	});
	if (!invoice) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");

	const item = invoice.items.find((entry) => entry.id === itemId);
	if (!item) throw new AppError(httpStatus.NOT_FOUND, "Invoice item not found");

	if (
		invoice.status === InvoiceStatus.PAID ||
		invoice.status === InvoiceStatus.CANCELLED
	)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Additional costs can only be removed while the invoice is DRAFT or ISSUED",
		);

	if (user.role === UserRole.TECHNICIAN) {
		const technician = await prisma.technician.findUnique({
			where: { userId: user.userId },
		});
		if (!technician)
			throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
		if (invoice.workOrder.technicianId !== technician.id)
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You can only remove costs from work orders assigned to you",
			);
	}

	const newAmount = Number(invoice.amount) - Number(item.amount);
	if (newAmount < 0)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot remove this cost because it would make the invoice amount negative",
		);

	return prisma.$transaction(async (tx) => {
		await tx.invoiceItem.delete({ where: { id: itemId } });
		await tx.invoice.update({
			where: { id: invoiceId },
			data: { amount: String(newAmount) },
		});

		return tx.invoice.findUniqueOrThrow({
			where: { id: invoiceId },
			include,
		});
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
	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getInvoiceById = async (id: string, user: RequestUser) => {
	const invoice = await prisma.invoice.findUnique({ where: { id }, include });
	if (!invoice) throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
	if (
		user.role === UserRole.CUSTOMER &&
		invoice.customer.userId !== user.userId
	)
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You can only access your own invoices",
		);
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
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Paid invoices cannot be deleted",
		);
	await prisma.invoice.delete({ where: { id } });
	return { message: "Invoice deleted successfully" };
};

export const invoiceService = {
	createInvoice,
	addInvoiceItem,
	deleteInvoiceItem,
	getAllInvoices,
	getInvoiceById,
	updateInvoice,
	deleteInvoice,
};
