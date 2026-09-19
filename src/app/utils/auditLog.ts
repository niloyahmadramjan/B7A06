import { prisma } from "../lib/prisma";

export interface IAuditLogPayload {
	actorId?: string | null;
	action: string;
	entity: string;
	entityId?: string | null;
	changes?: Record<string, any>;
}

export const recordAuditLog = async (payload: IAuditLogPayload) => {
	try {
		await prisma.auditLog.create({
			data: {
				actorId: payload.actorId ?? null,
				action: payload.action,
				entity: payload.entity,
				entityId: payload.entityId ?? null,
				...(payload.changes === undefined ? {} : { changes: payload.changes }),
			},
		});
	} catch {
		// audit logging is best-effort and must never break the main flow
	}
};
