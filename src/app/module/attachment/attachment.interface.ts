import type { AttachmentType } from "../../../generated/prisma/enums";

export interface ICreateAttachment {
	requestId?: string;
	workOrderId?: string;
	type?: AttachmentType;
}

export interface IAttachmentQuery {
	requestId?: string;
	workOrderId?: string;
	type?: string;
	page?: string;
	limit?: string;
}
