import { randomBytes } from "node:crypto";
import httpStatus from "http-status";
import { type AttachmentType, UserRole } from "../../../generated/prisma/enums";
import type { AttachmentWhereInput } from "../../../generated/prisma/models";
import { cloudinaryUpload } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	IAttachmentQuery,
	ICreateAttachment,
} from "./attachment.interface";

const include = {
	request: {
		select: {
			id: true,
			requestNumber: true,
			title: true,
			customerId: true,
		},
	},
	workOrder: {
		select: {
			id: true,
			workOrderNumber: true,
			title: true,
			customerId: true,
			technicianId: true,
		},
	},
} as const;

const uploadToCloudinary = (
	buffer: Buffer,
): Promise<{ secureUrl: string; publicId: string }> =>
	new Promise((resolve, reject) => {
		const uploadStream = cloudinaryUpload.uploader.upload_stream(
			{
				folder: "attachments",
				resource_type: "auto",
				public_id: `${Date.now()}_${randomBytes(8).toString("hex")}`,
			},
			(error, result) => {
				if (error || !result) {
					reject(
						error ?? new AppError(httpStatus.BAD_GATEWAY, "File upload failed"),
					);
				} else {
					resolve({ secureUrl: result.secure_url, publicId: result.public_id });
				}
			},
		);
		uploadStream.end(buffer);
	});

const destroyFromCloudinary = (publicId: string) =>
	cloudinaryUpload.uploader.destroy(publicId).catch(() => undefined);

const getPublicIdFromUrl = (fileUrl: string) => {
	const match = fileUrl.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
	return match ? match[1] : "";
};

const inferTypeFromMime = (mime: string): AttachmentType => {
	if (mime.startsWith("image/")) return "IMAGE";
	if (
		mime.startsWith("application/pdf") ||
		mime.startsWith("text/") ||
		mime.includes("document") ||
		mime.includes("spreadsheet") ||
		mime.includes("presentation")
	)
		return "DOCUMENT";
	return "OTHER";
};

const findCustomerByIdentity = (userId: string) =>
	prisma.customer.findUnique({ where: { userId } });

const findTechnicianByIdentity = (userId: string) =>
	prisma.technician.findUnique({ where: { userId } });

const assertContextAccess = async (
	payload: ICreateAttachment,
	user: RequestUser,
) => {
	if (!payload.requestId && !payload.workOrderId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"At least one of request ID or work order ID is required",
		);
	}

	if (payload.requestId) {
		const request = await prisma.serviceRequest.findUnique({
			where: { id: payload.requestId },
		});
		if (!request) {
			throw new AppError(httpStatus.NOT_FOUND, "Service request not found");
		}

		if (user.role === UserRole.CUSTOMER) {
			const customer = await findCustomerByIdentity(user.userId);
			if (!customer) {
				throw new AppError(httpStatus.NOT_FOUND, "Customer profile not found");
			}
			if (request.customerId !== customer.id) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"You can only attach files to your own service requests",
				);
			}
		}
	}

	if (payload.workOrderId) {
		const workOrder = await prisma.workOrder.findUnique({
			where: { id: payload.workOrderId },
		});
		if (!workOrder) {
			throw new AppError(httpStatus.NOT_FOUND, "Work order not found");
		}

		if (user.role === UserRole.CUSTOMER) {
			const customer = await findCustomerByIdentity(user.userId);
			if (!customer) {
				throw new AppError(httpStatus.NOT_FOUND, "Customer profile not found");
			}
			if (workOrder.customerId !== customer.id) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"You can only attach files to your own work orders",
				);
			}
		}

		if (user.role === UserRole.TECHNICIAN) {
			const technician = await findTechnicianByIdentity(user.userId);
			if (!technician) {
				throw new AppError(
					httpStatus.NOT_FOUND,
					"Technician profile not found",
				);
			}
			if (workOrder.technicianId !== technician.id) {
				throw new AppError(
					httpStatus.FORBIDDEN,
					"You can only attach files to work orders assigned to you",
				);
			}
		}
	}
};

const createAttachment = async (
	payload: ICreateAttachment,
	file: Express.Multer.File | undefined,
	user: RequestUser,
) => {
	if (!file) {
		throw new AppError(httpStatus.BAD_REQUEST, "A file is required");
	}

	await assertContextAccess(payload, user);

	const { secureUrl } = await uploadToCloudinary(file.buffer);

	const attachment = await prisma.attachment.create({
		data: {
			requestId: payload.requestId ?? null,
			workOrderId: payload.workOrderId ?? null,
			type: payload.type ?? inferTypeFromMime(file.mimetype),
			fileName: file.originalname,
			fileUrl: secureUrl,
		},
		include,
	});

	return attachment;
};

const getOwnershipCondition = (user: RequestUser) => {
	if (user.role === UserRole.CUSTOMER) {
		return {
			OR: [
				{ request: { customer: { userId: user.userId } } },
				{ workOrder: { customer: { userId: user.userId } } },
			],
		};
	}

	if (user.role === UserRole.TECHNICIAN) {
		return { workOrder: { technician: { userId: user.userId } } };
	}

	return {};
};

const getAllAttachments = async (
	query: IAttachmentQuery,
	user: RequestUser,
) => {
	const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
	const page = Math.max(Number(query.page) || 1, 1);

	if (query.type && !["IMAGE", "DOCUMENT", "OTHER"].includes(query.type)) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid attachment type");
	}

	const where: AttachmentWhereInput = {
		...(query.requestId ? { requestId: query.requestId } : {}),
		...(query.workOrderId ? { workOrderId: query.workOrderId } : {}),
		...(query.type ? { type: query.type as AttachmentType } : {}),
		...getOwnershipCondition(user),
	};

	const [data, total] = await Promise.all([
		prisma.attachment.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
			include,
		}),
		prisma.attachment.count({ where }),
	]);

	return {
		data,
		meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
	};
};

const getAttachmentById = async (attachmentId: string, user: RequestUser) => {
	const attachment = await prisma.attachment.findUnique({
		where: { id: attachmentId },
		include,
	});

	if (!attachment) {
		throw new AppError(httpStatus.NOT_FOUND, "Attachment not found");
	}

	if (user.role === UserRole.CUSTOMER) {
		const customer = await findCustomerByIdentity(user.userId);
		if (!customer) {
			throw new AppError(httpStatus.NOT_FOUND, "Customer profile not found");
		}
		const owned = attachment.workOrder
			? attachment.workOrder.customerId === customer.id
			: attachment.request?.customerId === customer.id;

		if (!owned) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You can only access your own attachments",
			);
		}
	}

	if (user.role === UserRole.TECHNICIAN) {
		const technician = await findTechnicianByIdentity(user.userId);
		if (!technician) {
			throw new AppError(httpStatus.NOT_FOUND, "Technician profile not found");
		}
		if (attachment.workOrder?.technicianId !== technician.id) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"You can only access attachments of work orders assigned to you",
			);
		}
	}

	return attachment;
};

const deleteAttachment = async (attachmentId: string, user: RequestUser) => {
	const attachment = await getAttachmentById(attachmentId, user);

	const publicId = getPublicIdFromUrl(attachment.fileUrl);
	if (publicId) {
		await destroyFromCloudinary(publicId);
	}

	await prisma.attachment.delete({ where: { id: attachmentId } });

	return { message: "Attachment deleted successfully" };
};

export const attachmentService = {
	createAttachment,
	getAllAttachments,
	getAttachmentById,
	deleteAttachment,
};
