import type {
	TechnicianApplicationStatus,
	TechnicianStatus,
} from "../../../generated/prisma/enums";

export interface IApplyTechnician {
	skills?: string;
	bio?: string;
}

export interface IUpdateTechnician {
	employeeId?: string | null;
	skills?: string | null;
	bio?: string | null;
	status?: TechnicianStatus;
}

export interface ITechnicianQuery {
	applicationStatus?: TechnicianApplicationStatus;
	status?: TechnicianStatus;
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";
}
