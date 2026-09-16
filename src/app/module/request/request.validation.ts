import { z } from "zod";

export const createServiceRequestSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),

  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),

  preferredDate: z
    .coerce
    .date()
    .optional(),

  address: z
    .string()
    .min(5, "Address is required")
    .max(500, "Address cannot exceed 500 characters"),

  city: z
    .string()
    .max(100, "City cannot exceed 100 characters")
    .optional(),

  district: z
    .string()
    .max(100, "District cannot exceed 100 characters")
    .optional(),
});

export const updateServiceRequestSchema = z.object({
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters")
    .optional(),

  description: z
    .string()
    .max(1000, "Description cannot exceed 1000 characters")
    .optional(),

  preferredDate: z
    .coerce
    .date()
    .optional(),

  address: z
    .string()
    .min(5, "Address is required")
    .max(500, "Address cannot exceed 500 characters")
    .optional(),

  city: z
    .string()
    .max(100, "City cannot exceed 100 characters")
    .optional(),

  district: z
    .string()
    .max(100, "District cannot exceed 100 characters")
    .optional(),

  status: z.enum([
    "PENDING",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
  ]).optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: "At least one field is required",
});