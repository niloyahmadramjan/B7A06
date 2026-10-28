import { z } from "zod";
import { WorkOrderStatus } from "../../../generated/prisma/enums";

export const updateWorkOrderStatusSchema = z
	.object({
		status: z.enum(WorkOrderStatus),
	})
	.strict();
