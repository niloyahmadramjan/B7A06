import type { WorkOrderStatus } from "../../../generated/prisma/enums";

export interface ICreateWorkOrder {
  requestId: string;
  title?: string;
  description?: string;
  estimatedCost?: string;
}

export interface IUpdateWorkOrder {
  title?: string;
  description?: string | null;
  technicianId?: string | null;
  status?: WorkOrderStatus;
  estimatedCost?: string | null;
  actualCost?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
}

export interface IWorkOrderQuery {
  searchTerm?: string;
  status?: WorkOrderStatus;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}
