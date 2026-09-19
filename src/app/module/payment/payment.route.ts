import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { PaymentController } from "./payment.controller";

const router = Router();

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
