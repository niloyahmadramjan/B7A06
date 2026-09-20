import { Router } from "express";
import { UserRole } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { auth } from "../../middleware/checkAuth";
import { validate } from "../../middleware/validate";
import { attachmentController } from "./attachment.controller";
import { createAttachmentSchema } from "./attachment.validation";

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
