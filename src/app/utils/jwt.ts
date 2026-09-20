import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const createToken = (
	payload: JwtPayload,
	secret: string,
	expiresIn: SignOptions,
) => {
	const token = jwt.sign(payload, secret, {
		expiresIn,
	} as SignOptions);

	return token;
};

type VerifyTokenResult =
	| { success: true; data: JwtPayload | string }
	| { success: false; error: string };

const verifyToken = (token: string, secret: string): VerifyTokenResult => {
	try {
		const verifiedToken = jwt.verify(token, secret);
		return { success: true as const, data: verifiedToken };
	} catch (error: unknown) {
		console.log("Token verification failed:", error);
		const message =
			error instanceof Error ? error.message : "Token verification failed";
		return { success: false as const, error: message };
	}
};

export const jwtUtils = {
	createToken,
	verifyToken,
};
