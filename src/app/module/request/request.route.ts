import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { requestController } from "./request.controller";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

// Create service request
router.post("/service/:serviceId", auth(UserRole.CUSTOMER), requestController.createRequest);

// Get all requests
router.get("/", auth(UserRole.CUSTOMER), requestController.getAllRequests);

// Get request by ID
router.get("/:requestId", auth(UserRole.CUSTOMER), requestController.getRequestById);

// Update request
router.patch("/:requestId", auth(UserRole.CUSTOMER), requestController.updateRequest);

// Delete request
router.delete("/:requestId", auth(UserRole.CUSTOMER), requestController.deleteRequest);

export const requestRouter = router;
