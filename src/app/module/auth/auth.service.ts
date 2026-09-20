import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import { UserRole, UserStatus } from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";
import type {
	ILoginUserPayload,
	IRegisterUserPayload,
	IRequestUser,
} from "./auth.interface";

const normalizeEmail = (email?: string) =>
	email?.trim().toLowerCase() || undefined;
const normalizePhone = (phone: string) => phone.trim();

const createTokens = (user: {
	id: string;
	name: string;
	email: string | null;
	role: UserRole;
}) => {
	const payload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};
	return {
		accessToken: jwtUtils.createToken(
			payload,
			config.jwt_access_secret,
			config.jwt_access_expires_in as SignOptions,
		),
		refreshToken: jwtUtils.createToken(
			payload,
			config.jwt_refresh_secret,
			config.jwt_refresh_expires_in as SignOptions,
		),
	};
};

const registerUser = async (payload: IRegisterUserPayload) => {
	if (!payload.name?.trim() || !payload.phone?.trim() || !payload.password) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Name, phone, and password are required",
		);
	}

	if (payload.password.length < 8) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Password must be at least 8 characters long",
		);
	}

	const email = normalizeEmail(payload.email);
	const phone = normalizePhone(payload.phone);

	const existing = await prisma.user.findFirst({
		where: {
			OR: [{ phone }, ...(email ? [{ email }] : [])],
		},
	});

	if (existing) {
		throw new AppError(
			httpStatus.CONFLICT,
			"A user with this phone or email already exists",
		);
	}

	const passwordHash = await bcrypt.hash(
		payload.password,
		Number(config.bcrypt_salt_rounds) || 10,
	);

	const user = await prisma.user.create({
		data: {
			name: payload.name.trim(),
			phone,
			email,
			passwordHash,
			role: UserRole.CUSTOMER,

			customer: {
				create: {
					address: "",
				},
			},
		},

		omit: {
			passwordHash: true,
		},

		include: {
			customer: true,
		},
	});

	return {
		user,
		...createTokens(user),
	};
};

const loginUser = async (payload: ILoginUserPayload) => {
	if (!payload.email?.trim() || !payload.password)
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Email and password are required",
		);
	const email = payload.email.trim();
	const user = await prisma.user.findFirst({
		where: { email },
	});
	if (
		!user?.passwordHash ||
		!(await bcrypt.compare(payload.password, user.passwordHash))
	)
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
	if (user.status !== UserStatus.ACTIVE)
		throw new AppError(httpStatus.FORBIDDEN, "User account is not active");

	await prisma.user.update({
		where: { id: user.id },
		data: { lastLoginAt: new Date() },
	});
	const { passwordHash: _passwordHash, ...safe } = user;
	return { user: safe, ...createTokens(safe) };
};

const getMe = async (user: IRequestUser) => {
	const found = await prisma.user.findUnique({
		where: { id: user.userId },
		omit: { passwordHash: true },
	});
	if (!found) throw new AppError(httpStatus.NOT_FOUND, "User not found");
	return found;
};

const refreshToken = async (token: string) => {
	const verified = jwtUtils.verifyToken(token, config.jwt_refresh_secret);
	if (!verified.success || !verified.data)
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
	const user = await prisma.user.findUnique({
		where: { id: (verified.data as JwtPayload).userId },
	});
	if (!user || user.status !== UserStatus.ACTIVE)
		throw new AppError(httpStatus.FORBIDDEN, "User account is not active");
	return createTokens(user);
};

export const AuthService = { registerUser, loginUser, getMe, refreshToken };
