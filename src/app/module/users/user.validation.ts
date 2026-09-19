import { z } from "zod";

export const updateUserProfileSchema = z
	.object({
		name: z.string().min(2, "Name must be at least 2 characters").max(100),
		phone: z.string().min(6, "Phone must be at least 6 characters").max(20),
		avatarUrl: z.string().url("Avatar must be a valid URL").nullable(),
		address: z.string().max(500),
		city: z.string().max(100).nullable(),
		district: z.string().max(100).nullable(),
		skills: z.string().max(1000).nullable(),
		bio: z.string().max(1000).nullable(),
	})
	.partial()
	.strict()
	.refine((data) => Object.keys(data).length > 0, {
		message: "At least one field is required",
	});
