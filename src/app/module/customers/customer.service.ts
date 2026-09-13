import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import type { ICustomerPayload } from "./customer.interface";

const getCustomerProfile = async (id: string) => {
	const customerProfile = await prisma.customer.findUnique({
		where: {
			id,
		},
	});
	if (!customerProfile) {
		throw new AppError(httpStatus.NOT_FOUND, "Customer profile not found");
	}
	return customerProfile;
};

const updateCusomerProfile = async (payload: ICustomerPayload, id: string) => {
	const existingCustomerData = await prisma.customer.findUnique({
		where: {
			userId: id,
		},
	});
	if (!existingCustomerData) {
		throw new AppError(httpStatus.NOT_FOUND, "Customer profile not found");
	}
	const updateCusomerProfile = await prisma.customer.update({
		where: { id: existingCustomerData.id },
		data: { payload },
	});

	return updateCusomerProfile;
};

export const customerService = {
	getCustomerProfile,
	updateCusomerProfile,
};
