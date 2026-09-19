import { z } from "zod";

export const createFeedbackSchema = z
	.object({
		workOrderId: z.string().min(1, "Work order ID is required"),
		rating: z.coerce
			.number()
			.int("Rating must be a whole number")
			.min(1, "Rating must be at least 1")
			.max(5, "Rating must be at most 5"),
		comment: z
			.string()
			.trim()
			.max(1000, "Comment must be at most 1000 characters")
			.optional(),
	})
	.strict();
