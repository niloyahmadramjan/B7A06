import type { WorkOrderStatus } from "../../../generated/prisma/enums";

export interface IWorkOrderQuery {
	status?: WorkOrderStatus;
	searchTerm?: string;
	customerId?: string;
	technicianId?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}

export interface IUpdateWorkOrderStatus {
	status: WorkOrderStatus;
}
