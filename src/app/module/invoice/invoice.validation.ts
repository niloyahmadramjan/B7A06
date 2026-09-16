import { z } from "zod";

const money = z
	.union([z.string(), z.number()])
	.refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
		message: "Amount must be a non-negative number",
	})
	.transform(String);

const status = z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]);

const validDates = (data: { issuedAt?: Date | null; dueDate?: Date | null }) =>
	!data.dueDate || !data.issuedAt || data.dueDate > data.issuedAt;

export const createInvoiceSchema = z
	.object({
		workOrderId: z.string().min(1, "Work order ID is required"),
		customerId: z.string().min(1).optional(),
		amount: money.optional(),
		status: status.optional(),
		issuedAt: z.coerce.date().optional(),
		dueDate: z.coerce.date().optional(),
	})
	.strict()
	.refine(validDates, {
		message: "Due date must be after issued date",
		path: ["dueDate"],
	});

export const updateInvoiceSchema = z
	.object({
		amount: money.optional(),
		status: status.optional(),
		issuedAt: z.coerce.date().nullable().optional(),
		dueDate: z.coerce.date().nullable().optional(),
	})
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field is required",
	})
	.refine(validDates, {
		message: "Due date must be after issued date",
		path: ["dueDate"],
	});