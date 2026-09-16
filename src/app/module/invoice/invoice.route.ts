import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { invoiceController } from "./invoice.controller";
import { createInvoiceSchema, updateInvoiceSchema } from "./invoice.validation";

const validate = (schema: any) => (req: Request, _res: Response, next: NextFunction) => {
	const result = schema.safeParse(req.body);
	if (!result.success)
		return next(new AppError(httpStatus.BAD_REQUEST, result.error.issues.map((issue: { message: string }) => issue.message).join(", ")));
	req.body = result.data;
	next();
};

const router = Router();
router.post("/", auth(UserRole.MANAGER, UserRole.ADMIN), validate(createInvoiceSchema), invoiceController.createInvoice);
router.get("/", auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.CUSTOMER), invoiceController.getAllInvoices);
router.get("/:invoiceId", auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.CUSTOMER), invoiceController.getInvoiceById);
router.patch("/:invoiceId", auth(UserRole.MANAGER, UserRole.ADMIN), validate(updateInvoiceSchema), invoiceController.updateInvoice);
router.delete("/:invoiceId", auth(UserRole.MANAGER, UserRole.ADMIN), invoiceController.deleteInvoice);

export const invoiceRouter = router;