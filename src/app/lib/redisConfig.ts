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
