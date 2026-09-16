import type { VisitStatus } from "../../../generated/prisma/enums";

export interface ICreateServiceVisit {
	workOrderId: string;
	technicianId: string;
	scheduledStart: Date;
	scheduledEnd?: Date;
	notes?: string;
}

export interface IUpdateServiceVisit {
	scheduledStart?: Date;
	scheduledEnd?: Date | null;
	status?: VisitStatus;
	notes?: string | null;
}

export interface IServiceVisitQuery {
	workOrderId?: string;
	technicianId?: string;
	status?: VisitStatus;
	page?: string;
	limit?: string;
}
