import { z } from "zod";

export const updateWorkOrderStatusSchema = z
	.object({
		status: z.enum(["CANCELLED"], "Only CANCELLED status can be set"),
	})
	.strict();
