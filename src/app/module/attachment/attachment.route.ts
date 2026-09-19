import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import httpStatus from "http-status";
import { UserRole } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import { attachmentController } from "./attachment.controller";
import { createAttachmentSchema } from "./attachment.validation";

const validate =
  (schema: any) => (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new AppError(
          httpStatus.BAD_REQUEST,
          result.error.issues
            .map((issue: { message: string }) => issue.message)
            .join(", "),
        ),
      );
    }
    req.body = result.data;
    next();
  };

const router = Router();

router.post(
  "/",
  auth(
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.CUSTOMER,
    UserRole.TECHNICIAN,
  ),
  upload.single("file"),
  validate(createAttachmentSchema),
  attachmentController.createAttachment,
);
router.get(
  "/",
  auth(
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.CUSTOMER,
    UserRole.TECHNICIAN,
  ),
  attachmentController.getAllAttachments,
);
router.get(
  "/:attachmentId",
  auth(
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.CUSTOMER,
    UserRole.TECHNICIAN,
  ),
  attachmentController.getAttachmentById,
);
router.delete(
  "/:attachmentId",
  auth(
    UserRole.MANAGER,
    UserRole.ADMIN,
    UserRole.CUSTOMER,
    UserRole.TECHNICIAN,
  ),
  attachmentController.deleteAttachment,
);

export const attachmentRouter = router;
