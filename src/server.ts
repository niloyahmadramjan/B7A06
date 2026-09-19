import app from "./app";
import config from "./app/config";
import { prisma } from "./app/lib/prisma";
import { ensureRedisConnected } from "./app/lib/redisConfig";

const PORT = config.port;

const main = async () => {
	try {
		await Promise.all([
			prisma.$connect(),
			ensureRedisConnected().catch(() => undefined),
		]);
		console.log("Connected to the database successfully.");
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	} catch (error) {
		console.error("Error starting the server:", error);
		await prisma.$disconnect();
		process.exit(1);
	}
};

main();
