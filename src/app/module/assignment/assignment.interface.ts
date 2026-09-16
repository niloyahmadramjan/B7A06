import type { AssignmentStatus } from "../../../generated/prisma/enums";
export interface ICreateAssignment {
  workOrderId: string;
  technicianId: string;
}
export interface IUpdateAssignment {
  status: AssignmentStatus;
}
export interface IAssignmentQuery {
  status?: AssignmentStatus;
  workOrderId?: string;
  technicianId?: string;
  page?: string;
  limit?: string;
}
