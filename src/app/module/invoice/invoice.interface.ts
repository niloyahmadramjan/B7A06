import type {
	InvoiceStatus,
	ItemCategory,
} from "../../../generated/prisma/enums";

export interface IInvoiceItem {
	title: string;
	category?: ItemCategory;
	amount: string;
}

export interface ICreateInvoice {
	workOrderId: string;
	customerId?: string;
	amount?: string;
	status?: InvoiceStatus;
	issuedAt?: Date;
	dueDate?: Date;
	items?: IInvoiceItem[];
}

export interface IUpdateInvoice {
	amount?: string;
	status?: InvoiceStatus;
	issuedAt?: Date | null;
	dueDate?: Date | null;
}

export interface ICreateInvoiceItem {
	title: string;
	category?: ItemCategory;
	amount: string;
}

export interface IInvoiceQuery {
	status?: InvoiceStatus;
	customerId?: string;
	workOrderId?: string;
	page?: string;
	limit?: string;
}
