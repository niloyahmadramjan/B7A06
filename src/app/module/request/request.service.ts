import httpstatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { RequestUser } from "../../middleware/checkAuth";
import { ICreateServiceRequest } from "./request.interface";
import crypto from "crypto";
import { ServiceRequestStatus } from "../../../generated/prisma/enums";

const createRequest = async (
  payload: ICreateServiceRequest,
  serviceId: string,
  user: RequestUser,
) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!existingCustomer) {
    throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
  }

  const existingService = await prisma.service.findUnique({
    where: {
      id: serviceId,
    },
  });

  if (!existingService) {
    throw new AppError(httpstatus.NOT_FOUND, "Service not found!");
  }

  //   const requestNumber = crypto.randomBytes(4).toString("hex").toUpperCase();
  const requestNumber = `REQ-${Date.now()}-${crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase()}`;

  const createRequest = await prisma.serviceRequest.create({
    data: {
      customerId: existingCustomer.id,
      serviceId: serviceId,
      title: payload.title,
      description: payload.description,
      preferredDate: payload.preferredDate,
      address: payload.address,
      city: payload.city,
      district: payload.district,
      requestNumber,
    },
  });

  return createRequest;
};

const getAllRequests = async (user: RequestUser) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!existingCustomer) {
    throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
  }

  const requests = await prisma.serviceRequest.findMany({
    where: {
      customerId: existingCustomer.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return requests;
};
const getRequestById = async (requestId: string, user: RequestUser) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!existingCustomer) {
    throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
  }

  const request = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      customerId: existingCustomer.id,
    },
  });

  if (!request) {
    throw new AppError(httpstatus.NOT_FOUND, "Request not found");
  }

  return request;
};
const updateRequest = async (
  requestId: string,
  payload: Partial<ICreateServiceRequest>,
  user: RequestUser,
) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!existingCustomer) {
    throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
  }

  const existingRequest = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      customerId: existingCustomer.id,
    },
  });

  if (!existingRequest) {
    throw new AppError(httpstatus.NOT_FOUND, "Request not found");
  }

  const updatedRequest = await prisma.serviceRequest.update({
    where: {
      id: requestId,
    },
    data: {
      ...payload,
    },
  });

  return updatedRequest;
};

const deleteRequest = async (requestId: string, user: RequestUser) => {
  const existingCustomer = await prisma.customer.findUnique({
    where: {
      userId: user.userId,
    },
  });

  if (!existingCustomer) {
    throw new AppError(httpstatus.NOT_FOUND, "Customer profile not found");
  }

  const existingRequest = await prisma.serviceRequest.findFirst({
    where: {
      id: requestId,
      customerId: existingCustomer.id,
    },
  });

  if (!existingRequest) {
    throw new AppError(httpstatus.NOT_FOUND, "Request not found");
  }
  if(existingRequest.status !== ServiceRequestStatus.PENDING) {
    throw new AppError(httpstatus.BAD_REQUEST, "Only pending requests can be deleted");
  }

  await prisma.serviceRequest.delete({
    where: {
      id: requestId,
      customerId: existingCustomer.id,
    },
  });

  return { message: "Request deleted successfully" };
};




const requestService = {
  createRequest,
  getAllRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
};
