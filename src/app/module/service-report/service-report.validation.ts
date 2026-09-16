import { z } from "zod";

export const createServiceReportSchema = z
	.object({
		workOrderId: z.string().min(1, "Work order ID is required"),
		technicianId: z.string().min(1, "Technician ID is required"),
		diagnosis: z.string().max(2000).optional(),
		workPerformed: z.string().max(5000).optional(),
		notes: z.string().max(2000).optional(),
	})
	.strict()
	.refine(
		(data) => Boolean(data.diagnosis) || Boolean(data.workPerformed),
		{
			message: "At least one of diagnosis or workPerformed is required",
		},
	);

export const updateServiceReportSchema = z
	.object({
		diagnosis: z.string().max(2000).nullable().optional(),
		workPerformed: z.string().max(5000).nullable().optional(),
		notes: z.string().max(2000).nullable().optional(),
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field is required",
	});