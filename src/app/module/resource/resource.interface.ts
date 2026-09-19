import type { ServiceRequestStatus } from "../../../generated/prisma/enums";

export interface ICreateResource {
	serviceId: string;
	title: string;
	description?: string;
	preferredDate?: Date;
	address: string;
	city?: string;
	district?: string;
}

export interface IUpdateResource {
	title?: string;
	description?: string;
	preferredDate?: Date;
	address?: string;
	city?: string;
	district?: string;
}

export interface IResourceQuery {
	status?: ServiceRequestStatus;
	serviceId?: string;
	customerId?: string;
	searchTerm?: string;
	q?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: string;
}
