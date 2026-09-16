export interface ICreateServiceReport {
	workOrderId: string;
	technicianId: string;
	diagnosis?: string;
	workPerformed?: string;
	notes?: string;
}

export interface IUpdateServiceReport {
	diagnosis?: string | null;
	workPerformed?: string | null;
	notes?: string | null;
}

export interface IServiceReportQuery {
	workOrderId?: string;
	technicianId?: string;
	page?: string;
	limit?: string;
}