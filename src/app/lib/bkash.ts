import config from "../config";
import { ensureRedisConnected, redisClient } from "./redisConfig";

const ID_TOKEN_KEY = "bkash:idToken";
const REFRESH_TOKEN_KEY = "bkash:refreshToken";

const grantHeaders = {
	"content-type": "application/json",
	accept: "application/json",
	username: config.bkash_username,
	password: config.bkash_password,
};

const readCache = async () => {
	if (!(await ensureRedisConnected())) return null;

	try {
		const [idTokenTTL, refreshTokenTTL, idToken, refreshToken] =
			await Promise.all([
				redisClient.ttl(ID_TOKEN_KEY),
				redisClient.ttl(REFRESH_TOKEN_KEY),
				redisClient.get(ID_TOKEN_KEY),
				redisClient.get(REFRESH_TOKEN_KEY),
			]);

		return { idTokenTTL, refreshTokenTTL, idToken, refreshToken };
	} catch {
		// a closed or unavailable client must not break the bKash flow
		return null;
	}
};

const writeCache = async (idToken: string, refreshToken?: string) => {
	if (!(await ensureRedisConnected())) return;

	try {
		await Promise.all([
			redisClient.set(ID_TOKEN_KEY, idToken, {
				expiration: { type: "EX", value: 60 * 60 },
			}),
			...(refreshToken
				? [
						redisClient.set(REFRESH_TOKEN_KEY, refreshToken, {
							expiration: { type: "EX", value: 60 * 60 * 24 * 28 },
						}),
					]
				: []),
		]);
	} catch {
		// caching is best-effort
	}
};

const grantToken = async () => {
	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/token/grant`,
		{
			method: "POST",
			headers: grantHeaders,
			body: JSON.stringify({
				app_key: config.bkash_app_key,
				app_secret: config.bkash_app_secret,
			}),
		},
	);

	const result = await response.json();

	if (!response.ok) {
		throw new Error(result?.statusMessage || "Failed to get bKash ID token");
	}

	if (result?.statusCode !== "0000") {
		throw new Error(result?.statusMessage || "bKash token generation failed");
	}

	const idToken = result.id_token as string;

	await writeCache(idToken, result.refresh_token);

	return idToken;
};

const refreshBkashToken = async (refreshTokenValue: string) => {
	const response = await fetch(
		`${config.bkash_base_url}/tokenized/checkout/token/refresh`,
		{
			method: "POST",
			headers: grantHeaders,
			body: JSON.stringify({
				app_key: config.bkash_app_key,
				app_secret: config.bkash_app_secret,
				refresh_token: refreshTokenValue,
			}),
		},
	);

	const result = await response.json();

	if (!response.ok) {
		throw new Error(
			result?.statusMessage || "Failed to refresh bKash ID token",
		);
	}

	const idToken = result.id_token as string;

	await writeCache(idToken);

	return idToken;
};

export const getBkashIdToken = async () => {
	const cache = await readCache();

	const idTokenTTL = cache?.idTokenTTL ?? -1;
	const refreshTokenTTL = cache?.refreshTokenTTL ?? -1;
	const idToken = cache?.idToken ?? null;
	const refreshToken = cache?.refreshToken ?? null;

	// cached token is still valid for more than 10 minutes
	if (idToken && idTokenTTL > 600) {
		return idToken;
	}

	// cached token is about to expire but the refresh token is still valid
	if (refreshToken && idTokenTTL <= 600 && refreshTokenTTL > 600) {
		return refreshBkashToken(refreshToken);
	}

	// no usable tokens (or Redis unavailable) -> grant a fresh pair
	return grantToken();
};
