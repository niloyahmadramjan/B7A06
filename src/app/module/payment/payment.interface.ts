import type {
	PaymentMethod,
	PaymentStatus,
} from "../../../generated/prisma/enums";

export interface IPaymentQuery {
	status?: PaymentStatus;
	method?: PaymentMethod;
	invoiceId?: string;
	customerId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
	[key: string]: any;
}
