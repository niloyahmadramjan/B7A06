import bcrypt from "bcryptjs";
import config from "../src/app/config";
import { prisma } from "../src/app/lib/prisma";
import {
	TechnicianApplicationStatus,
	TechnicianStatus,
	UserRole,
	UserStatus,
} from "../src/generated/prisma/enums";

const hashPassword = (password: string) =>
	bcrypt.hash(password, Number(config.bcrypt_salt_rounds) || 10);

const assertCredentials = (
	label: string,
	email?: string,
	password?: string,
) => {
	if (!email || !password) {
		throw new Error(`${label} email/password is missing in the env file`);
	}
	return { email, password };
};

const seedAdmin = async () => {
	const { email, password } = assertCredentials(
		"Admin",
		config.admin_email,
		config.admin_pass,
	);

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		console.log("Admin already exists:", email);
		return;
	}

	const user = await prisma.user.create({
		data: {
			name: "System Admin",
			email,
			phone: "01700000001",
			passwordHash: await hashPassword(password),
			role: UserRole.ADMIN,
			status: UserStatus.ACTIVE,
		},
		omit: { passwordHash: true },
	});

	console.log("Admin created:", user.email);
};

const seedManager = async () => {
	const { email, password } = assertCredentials(
		"Manager",
		config.manager_email,
		config.manager_pass,
	);

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		console.log("Manager already exists:", email);
		return;
	}

	const user = await prisma.user.create({
		data: {
			name: "Operations Manager",
			email,
			phone: "01700000002",
			passwordHash: await hashPassword(password),
			role: UserRole.MANAGER,
			status: UserStatus.ACTIVE,
		},
		omit: { passwordHash: true },
	});

	console.log("Manager created:", user.email);
};

const seedTechnician = async () => {
	const { email, password } = assertCredentials(
		"Technician",
		config.technician_email,
		config.technician_pass,
	);

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		console.log("Technician already exists:", email);
		return;
	}

	const user = await prisma.user.create({
		data: {
			name: "Field Technician",
			email,
			phone: "01700000003",
			passwordHash: await hashPassword(password),
			role: UserRole.TECHNICIAN,
			status: UserStatus.ACTIVE,
			technician: {
				create: {
					employeeId: "TECH-0001",
					status: TechnicianStatus.AVAILABLE,
					applicationStatus: TechnicianApplicationStatus.APPROVED,
					skills: "AC repair, Electrical, Plumbing",
					bio: "Experienced field technician with 5+ years of hands-on service experience.",
				},
			},
		},
		omit: { passwordHash: true },
		include: { technician: true },
	});

	console.log("Technician created:", user.email);
};

const seedCustomer = async () => {
	const { email, password } = assertCredentials(
		"Customer",
		config.customer_email,
		config.customer_pass,
	);

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		console.log("Customer already exists:", email);
		return;
	}

	const user = await prisma.user.create({
		data: {
			name: "Test Customer",
			email,
			phone: "01700000004",
			passwordHash: await hashPassword(password),
			role: UserRole.CUSTOMER,
			status: UserStatus.ACTIVE,
			customer: {
				create: {
					address: "House 12, Road 5, Dhanmondi",
					city: "Dhaka",
					district: "Dhaka",
				},
			},
		},
		omit: { passwordHash: true },
		include: { customer: true },
	});

	console.log("Customer created:", user.email);
};

const main = async () => {
	await seedAdmin();
	await seedManager();
	await seedTechnician();
	await seedCustomer();
};

main()
	.catch((error) => {
		console.error("Seeding failed:", error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
