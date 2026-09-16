import { z } from "zod";

const date = z.coerce.date();
const status = z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);

const validSchedule = (data: {
	scheduledStart?: Date;
	scheduledEnd?: Date | null;
}) =>
	!data.scheduledEnd ||
	!data.scheduledStart ||
	data.scheduledEnd > data.scheduledStart;

export const createServiceVisitSchema = z
	.object({
		workOrderId: z.string().min(1, "Work order ID is required"),
		technicianId: z.string().min(1, "Technician ID is required"),
		scheduledStart: date,
		scheduledEnd: date.optional(),
		notes: z.string().max(2000).optional(),
	})
	.strict()
	.refine(validSchedule, {
		message: "Scheduled end must be after scheduled start",
		path: ["scheduledEnd"],
	});

export const updateServiceVisitSchema = z
	.object({
		scheduledStart: date.optional(),
		scheduledEnd: date.nullable().optional(),
		status: status.optional(),
		notes: z.string().max(2000).nullable().optional(),
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field is required",
	})
	.refine(validSchedule, {
		message: "Scheduled end must be after scheduled start",
		path: ["scheduledEnd"],
	});
