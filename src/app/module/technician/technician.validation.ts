import { z } from "zod";

export const applyTechnicianSchema = z
	.object({
		employeeId: z.string().min(1).max(50).optional(),
		skills: z.string().max(1000).optional(),
		bio: z.string().max(2000).optional(),
	})
	.strict();

export const rejectTechnicianSchema = z
	.object({
		reason: z.string().max(1000).optional(),
	})
	.strict();

export const updateTechnicianSchema = z
	.object({
		employeeId: z.string().min(1).max(50).nullable().optional(),
		skills: z.string().max(1000).nullable().optional(),
		bio: z.string().max(2000).nullable().optional(),
		status: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]).optional(),
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field is required",
	});
