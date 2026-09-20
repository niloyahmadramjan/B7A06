import app from "./app";
import config from "./app/config";
import { prisma } from "./app/lib/prisma";
import { ensureRedisConnected } from "./app/lib/redisConfig";
import { seedDefaultUsers } from "./app/utils/seed";

const PORT = config.port;

const main = async () => {
	try {
		await Promise.all([
			prisma.$connect(),
			ensureRedisConnected().catch(() => undefined),
		]);
		console.log("Connected to the database successfully.");

		try {
			await seedDefaultUsers();
			console.log("Default users ensured.");
		} catch (error) {
			console.error("Failed to ensure default users:", error);
		}

		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

// When deployed on Vercel, this module IS the serverless handler (default export).
// The long-running HTTP bootstrap above only runs outside the Vercel runtime.
if (process.env.VERCEL !== "1") {
	main();
}

export default app;
