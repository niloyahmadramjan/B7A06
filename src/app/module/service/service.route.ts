import { Router } from "express";
import { serviceController } from "./service.controller";
import { auth } from "../../middleware/checkAuth";
import { UserRole } from "../../../generated/prisma/enums";

const router = Router();

router.post(
  "/create",
  auth(UserRole.ADMIN, UserRole.MANAGER),
  serviceController.createService,
);

router.get("/get-all", serviceController.allService);

router.put(
  "/update/:serviceId",
  auth(UserRole.ADMIN, UserRole.MANAGER),
  serviceController.updateService,
);

router.delete(
  "/delete/:serviceId",
  auth(UserRole.ADMIN, UserRole.MANAGER),
  serviceController.deleteServie,
);

export const ServiceRouter = router;
