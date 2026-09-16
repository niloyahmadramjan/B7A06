import type { ServiceRequestStatus } from "../../../generated/prisma/enums";

export interface ICreateServiceRequest {
  customerId: string;
  serviceId: string;
  title: string;
  description?: string;
  preferredDate?: Date;
  address: string;
  city?: string;
  district?: string;
}

export interface IUpdateServiceRequest {
  title?: string;
  description?: string;
  preferredDate?: Date;
  address?: string;
  city?: string;
  district?: string;
  status?: ServiceRequestStatus;
}