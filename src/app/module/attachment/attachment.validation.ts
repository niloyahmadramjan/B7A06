import { z } from "zod";
import { AttachmentType } from "../../../generated/prisma/enums";

export const createAttachmentSchema = z
	.object({
		requestId: z.string().min(1, "Request ID is required").optional(),
		workOrderId: z.string().min(1, "Work order ID is required").optional(),
		type: z
			.enum([
				AttachmentType.IMAGE,
				AttachmentType.DOCUMENT,
				AttachmentType.OTHER,
			])
			.optional(),
	})
	.strict();
