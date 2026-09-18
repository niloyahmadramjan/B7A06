import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { technicianController } from "./technician.controller";
import {
	applyTechnicianSchema,
	rejectTechnicianSchema,
	updateTechnicianSchema,
} from "./technician.validation";

const validate =
	(schema: any) => (req: Request, _res: Response, next: NextFunction) => {
		const result = schema.safeParse(req.body);
		if (!result.success)
			return next(
				new AppError(
					httpStatus.BAD_REQUEST,
					result.error.issues
						.map((issue: { message: string }) => issue.message)
						.join(", "),
				),
			);
		req.body = result.data;
		next();
	};

const router = Router();

// Customer applies to become a technician (status = PENDING)
router.post(
	"/apply",
	auth(UserRole.CUSTOMER),
	validate(applyTechnicianSchema),
	technicianController.applyAsTechnician,
);

// Applicant's own application status
router.get(
	"/my-application",
	auth(UserRole.CUSTOMER, UserRole.TECHNICIAN),
	technicianController.getMyApplication,
);

// Admin/Manager approve the application (PENDING -> APPROVED, user becomes TECHNICIAN)
router.patch(
	"/approve/:technicianId",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	technicianController.approveTechnician,
);

// Admin/Manager reject the application (PENDING -> REJECTED)
router.patch(
	"/reject/:technicianId",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	validate(rejectTechnicianSchema),
	technicianController.rejectTechnician,
);

// Admin/Manager list technicians/applications
router.get(
	"/",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	technicianController.getAllTechnicians,
);

// Update technician profile (self or admin/manager)
router.patch(
	"/update/:technicianId",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN),
	validate(updateTechnicianSchema),
	technicianController.updateTechnician,
);

// Get one technician
router.get(
	"/:technicianId",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN),
	technicianController.getTechnicianById,
);

// Delete technician
router.delete(
	"/:technicianId",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	technicianController.deleteTechnician,
);

export const technicianRouter = router;