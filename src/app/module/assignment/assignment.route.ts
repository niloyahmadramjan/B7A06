import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { validate } from "../../middleware/validate";
import { assignmentController } from "./assignment.controller";
import { createAssignmentSchema } from "./assignment.validation";

const router = Router();
router.post(
	"/",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	validate(createAssignmentSchema),
	assignmentController.createAssignment,
);
router.get(
	"/",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN),
	assignmentController.getAllAssignments,
);
router.get(
	"/:assignmentId",
	auth(UserRole.MANAGER, UserRole.ADMIN, UserRole.TECHNICIAN),
	assignmentController.getAssignmentById,
);
router.patch(
	"/:assignmentId/accept",
	auth(UserRole.TECHNICIAN),
	assignmentController.acceptAssignment,
);
router.patch(
	"/:assignmentId/reject",
	auth(UserRole.TECHNICIAN),
	assignmentController.rejectAssignment,
);
router.delete(
	"/:assignmentId",
	auth(UserRole.MANAGER, UserRole.ADMIN),
	assignmentController.deleteAssignment,
);
export const assignmentRouter = router;
