import type { InvoiceStatus } from "../../../generated/prisma/enums";

export interface ICreateInvoice {
	workOrderId: string;
	customerId?: string;
	amount?: string;
	status?: InvoiceStatus;
	issuedAt?: Date;
	dueDate?: Date;
}

export interface IUpdateInvoice {
	amount?: string;
	status?: InvoiceStatus;
	issuedAt?: Date | null;
	dueDate?: Date | null;
}

export interface IInvoiceQuery {
	status?: InvoiceStatus;
	customerId?: string;
	workOrderId?: string;
	page?: string;
	limit?: string;
}