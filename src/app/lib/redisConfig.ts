import { createClient } from "redis";
import config from "../config";

export const redisClient = createClient({
	username: config.redis_user_name,
	password: config.redis_pass,
	socket: {
		host: config.redis_host,
		port: Number(config.redis_port),
	},
});

redisClient.on("error", (error) => {
	// swallow connection errors; callers handle Redis unavailability gracefully
	console.error("Redis error:", error.message);
});

export const ensureRedisConnected = async (): Promise<boolean> => {
	try {
		if (!redisClient.isOpen) {
			await redisClient.connect();
		}
		return true;
	} catch {
		return false;
	}
};
