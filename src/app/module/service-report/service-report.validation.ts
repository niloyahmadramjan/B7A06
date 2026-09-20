import { z } from "zod";

export const createServiceReportSchema = z
	.object({
		workOrderId: z.string().min(1, "Work order ID is required"),
		diagnosis: z
			.string()
			.trim()
			.max(5000, "Diagnosis must be at most 5000 characters")
			.optional(),
		workPerformed: z
			.string()
			.trim()
			.max(5000, "Work performed must be at most 5000 characters")
			.optional(),
		notes: z
			.string()
			.trim()
			.max(2000, "Notes must be at most 2000 characters")
			.optional(),
	})
	.strict()
	.refine((data) => data.diagnosis || data.workPerformed || data.notes, {
		message: "At least one of diagnosis, workPerformed or notes is required",
	});

export const updateServiceReportSchema = z
	.object({
		diagnosis: z.string().trim().max(5000).optional(),
		workPerformed: z.string().trim().max(5000).optional(),
		notes: z.string().trim().max(2000).optional(),
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field is required",
	});
