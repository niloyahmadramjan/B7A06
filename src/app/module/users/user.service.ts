import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type { IUpdateUserProfile } from "./user.interface";

const profileInclude = { customer: true, technician: true } as const;

const getMe = async (user: RequestUser) => {
	const found = await prisma.user.findUnique({
		where: { id: user.userId },
		omit: { passwordHash: true },
		include: profileInclude,
	});

	if (!found) {
		throw new AppError(httpStatus.NOT_FOUND, "User Not Found");
	}

	return found;
};

const updateMe = async (payload: IUpdateUserProfile, user: RequestUser) => {
	if (payload.phone) {
		const existing = await prisma.user.findFirst({
			where: { phone: payload.phone, NOT: { id: user.userId } },
		});

		if (existing) {
			throw new AppError(httpStatus.CONFLICT, "Phone Number Is Already In Use");
		}
	}

	return prisma.$transaction(async (tx) => {
		await tx.user.update({
			where: { id: user.userId },
			data: {
				...(payload.name !== undefined ? { name: payload.name } : {}),
				...(payload.phone !== undefined ? { phone: payload.phone } : {}),
				...(payload.avatarUrl !== undefined
					? { avatarUrl: payload.avatarUrl }
					: {}),
			},
		});

		if (user.role === UserRole.CUSTOMER) {
			const data = {
				...(payload.address !== undefined ? { address: payload.address } : {}),
				...(payload.city !== undefined ? { city: payload.city } : {}),
				...(payload.district !== undefined
					? { district: payload.district }
					: {}),
			};

			if (Object.keys(data).length) {
				await tx.customer.updateMany({ where: { userId: user.userId }, data });
			}
		}

		if (user.role === UserRole.TECHNICIAN) {
			const data = {
				...(payload.skills !== undefined ? { skills: payload.skills } : {}),
				...(payload.bio !== undefined ? { bio: payload.bio } : {}),
			};

			if (Object.keys(data).length) {
				await tx.technician.updateMany({
					where: { userId: user.userId },
					data,
				});
			}
		}

		return tx.user.findUnique({
			where: { id: user.userId },
			omit: { passwordHash: true },
			include: profileInclude,
		});
	});
};

export const userService = { getMe, updateMe };
