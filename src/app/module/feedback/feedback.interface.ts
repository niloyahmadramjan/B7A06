export interface ICreateFeedback {
	workOrderId: string;
	rating: number;
	comment?: string;
}

export interface IFeedbackQuery {
	workOrderId?: string;
	customerId?: string;
	technicianId?: string;
	rating?: string;
	page?: string;
	limit?: string;
}
