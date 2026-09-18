import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { auth } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { requestController } from "./request.controller";
import {
  createServiceRequestSchema,
  updateServiceRequestSchema,
} from "./request.validation";

const validate = (schema: any) => (req: Request, _res: Response, next: NextFunction) => {
  const result = schema.safeParse(req.body);
  if (!result.success)
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        result.error.issues.map((issue: { message: string }) => issue.message).join(", "),
      ),
    );
  req.body = result.data;
  next();
};

const router = Router();

// ==== Manager Review ====

// Get all requests for review
router.get(
  "/admin",
  auth(UserRole.MANAGER, UserRole.ADMIN),
  requestController.getAllRequestsForReview,
);

// Get a single request for review
router.get(
  "/admin/:requestId",
  auth(UserRole.MANAGER, UserRole.ADMIN),
  requestController.getRequestByIdForReview,
);

// Approve request (PENDING -> APPROVED, auto-generates work order)
router.patch(
  "/admin/approve/:requestId",
  auth(UserRole.MANAGER, UserRole.ADMIN),
  requestController.approveRequest,
);

// Reject request (PENDING -> REJECTED)
router.patch(
  "/admin/reject/:requestId",
  auth(UserRole.MANAGER, UserRole.ADMIN),
  requestController.rejectRequest,
);

// ==== Customer ====

// Create service request
router.post(
  "/service/:serviceId",
  auth(UserRole.CUSTOMER),
  validate(createServiceRequestSchema),
  requestController.createRequest,
);

// Get all requests
router.get("/", auth(UserRole.CUSTOMER), requestController.getAllRequests);

// Get request by ID
router.get("/:requestId", auth(UserRole.CUSTOMER), requestController.getRequestById);

// Update request
router.patch(
  "/:requestId",
  auth(UserRole.CUSTOMER),
  validate(updateServiceRequestSchema),
  requestController.updateRequest,
);

// Delete request
router.delete("/:requestId", auth(UserRole.CUSTOMER), requestController.deleteRequest);

export const requestRouter = router;