import httpStatus from "http-status";
import type { TechnicianAssignmentWhereInput } from "../../../generated/prisma/models";
import {
  AssignmentStatus,
  TechnicianStatus,
  UserRole,
  WorkOrderStatus,
} from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
  IAssignmentQuery,
  ICreateAssignment,
  IUpdateAssignment,
} from "./assignment.interface";

const include = {
  workOrder: true,
  technician: true,
  assignedBy: true,
} as const;

const createAssignment = async (p: ICreateAssignment, user: RequestUser) => {
  const wo = await prisma.workOrder.findUnique({
    where: { id: p.workOrderId },
  });
  if (!wo) throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
  if (wo.status !== WorkOrderStatus.CREATED)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only CREATED work orders can be assigned",
    );
  const tech = await prisma.technician.findUnique({
    where: { id: p.technicianId },
  });
  if (!tech) throw new AppError(httpStatus.NOT_FOUND, "Technician not found");
  if (tech.status === TechnicianStatus.OFFLINE)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Offline technicians cannot be assigned",
    );
  const duplicate = await prisma.technicianAssignment.findFirst({
    where: {
      workOrderId: p.workOrderId,
      technicianId: p.technicianId,
      status: AssignmentStatus.PENDING,
    },
  });
  if (duplicate)
    throw new AppError(
      httpStatus.CONFLICT,
      "This technician is already assigned to the work order",
    );
  return prisma.technicianAssignment.create({
    data: { ...p, assignedById: user.userId },
    include,
  });
};

const getAllAssignments = async (q: IAssignmentQuery, user: RequestUser) => {
  const limit = Math.min(Math.max(Number(q.limit) || 10, 1), 100),
    page = Math.max(Number(q.page) || 1, 1);
  const where: TechnicianAssignmentWhereInput = {
    ...(q.status ? { status: q.status } : {}),
    ...(q.workOrderId ? { workOrderId: q.workOrderId } : {}),
    ...(q.technicianId ? { technicianId: q.technicianId } : {}),
    ...(user.role === UserRole.TECHNICIAN
      ? { technician: { userId: user.userId } }
      : {}),
  };
  const [data, total] = await Promise.all([
    prisma.technicianAssignment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { assignedAt: "desc" },
      include,
    }),
    prisma.technicianAssignment.count({ where }),
  ]);
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

const getAssignmentById = async (id: string, user: RequestUser) => {
  const a = await prisma.technicianAssignment.findUnique({
    where: { id },
    include,
  });
  if (!a) throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
  if (user.role === UserRole.TECHNICIAN && a.technician.userId !== user.userId)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only access your own assignments",
    );
  return a;
};

const updateAssignment = async (
  id: string,
  p: IUpdateAssignment,
  user: RequestUser,
) => {
  if (user.role !== UserRole.TECHNICIAN)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only the assigned technician can respond to an assignment",
    );
  const a = await prisma.technicianAssignment.findUnique({
    where: { id },
    include: { technician: true, workOrder: true },
  });
  if (!a) throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
  if (user.role === UserRole.TECHNICIAN && a.technician.userId !== user.userId)
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update your own assignments",
    );
  if (a.status !== AssignmentStatus.PENDING)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only pending assignments can be updated",
    );
  return prisma.$transaction(async (tx) => {
    const updated = await tx.technicianAssignment.update({
      where: { id },
      data: { status: p.status, respondedAt: new Date() },
      include,
    });
    if (p.status === AssignmentStatus.ACCEPTED) {
      const changed = await tx.workOrder.updateMany({
        where: { id: a.workOrderId, status: WorkOrderStatus.CREATED },
        data: {
          status: WorkOrderStatus.ASSIGNED,
          technicianId: a.technicianId,
        },
      });
      if (changed.count !== 1)
        throw new AppError(
          httpStatus.CONFLICT,
          "This work order is no longer available for assignment",
        );
    }
    return updated;
  });
};

const deleteAssignment = async (id: string) => {
  const a = await prisma.technicianAssignment.findUnique({ where: { id } });
  if (!a) throw new AppError(httpStatus.NOT_FOUND, "Assignment not found");
  if (a.status !== AssignmentStatus.PENDING)
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Only pending assignments can be deleted",
    );
  await prisma.technicianAssignment.delete({ where: { id } });
  return { message: "Assignment deleted successfully" };
};
export const assignmentService = {
  createAssignment,
  getAllAssignments,
  getAssignmentById,
  updateAssignment,
  deleteAssignment,
};
