export interface ICreateServiceReport {
	workOrderId: string;
	diagnosis?: string;
	workPerformed?: string;
	notes?: string;
}

export interface IUpdateServiceReport {
	diagnosis?: string;
	workPerformed?: string;
	notes?: string;
}

export interface IServiceReportQuery {
	workOrderId?: string;
	technicianId?: string;
	page?: string;
	limit?: string;
}
