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
	[key: string]: unknown;
}

export interface IBkashGatewayResponse {
	statusCode?: string;
	statusMessage?: string;
	paymentID?: string;
	bkashURL?: string;
	trxID?: string;
	amount?: string;
	transactionStatus?: string;
	paymentExecuteTime?: string;
	[key: string]: unknown;
}
