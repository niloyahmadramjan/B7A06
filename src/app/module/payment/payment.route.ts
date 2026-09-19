import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PaymentController } from "./payment.controller";

const router = Router();

// ==== bKash Payment ====

// bKash redirects the payer's browser here after a payment attempt (public)
router.get("/callback", PaymentController.paymentCallback);

// Customer pays an issued invoice via bKash
router.post(
	"/:invoiceId/pay",
	auth(UserRole.CUSTOMER),
	PaymentController.payInvoice,
);

// ==== Admin / Manager ====

// Get all payments (with optional filtering)
router.get(
	"/all",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	PaymentController.getAllPayments,
);

// ==== Customer ====

// Get my payments
router.get("/my", auth(UserRole.CUSTOMER), PaymentController.getMyPayments);

// Get a single payment (customer can only access their own)
router.get(
	"/:paymentId",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.CUSTOMER),
	PaymentController.getSinglePayment,
);

export const paymentRouter = router;
