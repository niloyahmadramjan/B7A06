import { z } from "zod";
export const createAssignmentSchema = z
  .object({ workOrderId: z.string().min(1), technicianId: z.string().min(1) })
  .strict();
export const updateAssignmentSchema = z
  .object({ status: z.enum(["ACCEPTED", "REJECTED"]) })
  .strict();
