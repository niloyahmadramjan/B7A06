import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validate } from "../../middleware/validate";
import { invoiceController } from "./invoice.controller";
import {
	createInvoiceItemSchema,
	createInvoiceSchema,
	updateInvoiceSchema,
} from "./invoice.validation";

const router = Router();

router.post(
	"/",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	validate(createInvoiceSchema),
	invoiceController.createInvoice,
);
router.get(
	"/",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.CUSTOMER),
	invoiceController.getAllInvoices,
);
router.get(
	"/:invoiceId",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.CUSTOMER),
	invoiceController.getInvoiceById,
);
router.patch(
	"/:invoiceId",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	validate(updateInvoiceSchema),
	invoiceController.updateInvoice,
);
router.delete(
	"/:invoiceId",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	invoiceController.deleteInvoice,
);
router.post(
	"/:invoiceId/items",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN),
	validate(createInvoiceItemSchema),
	invoiceController.addInvoiceItem,
);
router.delete(
	"/:invoiceId/items/:itemId",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN),
	invoiceController.deleteInvoiceItem,
);

export const invoiceRouter = router;
