import { z } from "zod";

const money = z
  .union([z.string(), z.number()])
  .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, {
    message: "Cost must be a non-negative number",
  })
  .transform(String);

const status = z.enum([
  "CREATED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);

export const createWorkOrderSchema = z
  .object({
    requestId: z.string().min(1, "Request ID is required"),
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(1000).optional(),
    estimatedCost: money.optional(),
  })
  .strict();

export const updateWorkOrderSchema = z
  .object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    technicianId: z.string().min(1).nullable().optional(),
    status: status.optional(),
    estimatedCost: money.nullable().optional(),
    actualCost: money.nullable().optional(),
    startedAt: z.coerce.date().nullable().optional(),
    completedAt: z.coerce.date().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });
