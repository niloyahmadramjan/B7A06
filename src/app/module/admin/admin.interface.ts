import type { UserRole, UserStatus } from "../../../generated/prisma/enums";

export interface IAdminUserQuery {
	role?: UserRole;
	status?: UserStatus;
	searchTerm?: string;
	page?: string;
	limit?: string;
}

export interface IAuditLogQuery {
	entity?: string;
	action?: string;
	actorId?: string;
	entityId?: string;
	page?: string;
	limit?: string;
}
