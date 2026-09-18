import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { assignmentController } from "./assignment.controller";
import { createAssignmentSchema } from "./assignment.validation";
const validate =
  (schema: any) => (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body);
    if (!r.success)
      return next(
        new AppError(
          httpStatus.BAD_REQUEST,
          r.error.issues.map((i: { message: string }) => i.message).join(", "),
        ),
      );
    req.body = r.data;
    next();
  };
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
router.delete(
  "/:assignmentId",
  auth(UserRole.MANAGER, UserRole.ADMIN),
  assignmentController.deleteAssignment,
);
export const assignmentRouter = router;
