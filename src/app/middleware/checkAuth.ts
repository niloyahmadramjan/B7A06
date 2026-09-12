import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { UserRole, UserStatus } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";

declare global {
    namespace Express {
        interface Request {
            user?: {
                email: string | null;
                name: string;
                userId: string;
                role: UserRole;
            }
        }
    }
}

export const auth = (...requiredRoles: UserRole[]) => {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies.accessToken ?
            req.cookies.accessToken
            :
            req.headers.authorization?.startsWith("Bearer ") ?
                req.headers.authorization?.split(" ")[1]
                : req.headers.authorization;

        if (!token) {
            throw new Error("You are not logged in. Please log in to access this resource.");
        }

        const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

        if (!verifiedToken.success) {
            throw new Error(verifiedToken.error);
        }

        const { userId, role } = verifiedToken.data as JwtPayload;

        if (requiredRoles.length && !requiredRoles.includes(role)) {
            throw new Error("Forbidden. You don't have permission to access this resource.");
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            throw new Error("User not found. Please log in again.");
        }

        if (user.role !== role) {
            throw new Error("Your access level has changed. Please log in again.");
        }

        if (user.status !== UserStatus.ACTIVE) {
            throw new Error("Your account has been blocked. Please contact support.");
        }

        req.user = {
            email: user.email,
            name: user.name,
            userId,
            role
        }

        next();

    }
    )
}
