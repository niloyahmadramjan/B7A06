import config from "../config";
import { redisClient } from "./redisConfig";

export const getBkashIdToken = async () => {
	try {
		const IdTokenKey = "bkash:idToken";
		const RefreshTokenKey = "bkash:refreshToken";
		const bkashIdTokenTTl = await redisClient.ttl(IdTokenKey);
		const bkashRefreshTokenTTl = await redisClient.ttl(RefreshTokenKey);

		let bkashIdToken = await redisClient.get(IdTokenKey);
		const bkashRefreshToken = await redisClient.get(RefreshTokenKey);

		if (
			bkashIdTokenTTl <= 600 &&
			bkashRefreshToken &&
			bkashRefreshTokenTTl > 600
		) {
			const refreshTokenResponse = await fetch(
				`${config.bkash_base_url}/tokenized/checkout/token/refresh`,
				{
					method: "POST",
					headers: {
						"content-type": "application/json",
						accept: "application/json",
						username: config.bkash_username,
						password: config.bkash_password,
					},
					body: JSON.stringify({
						app_key: config.bkash_app_key,
						app_secret: config.bkash_app_secret,
						refresh_token: bkashRefreshToken,
					}),
				},
			);

			const bkashRefreshTokenResult = await refreshTokenResponse.json();
			if (!refreshTokenResponse.ok) {
				throw new Error(
					bkashRefreshTokenResult?.statusMessage ||
						"Failed to get bKash ID token",
				);
			}
			bkashIdToken = bkashRefreshTokenResult.id_token as string;
			await redisClient.set(IdTokenKey, bkashIdToken, {
				expiration: {
					type: "EX",
					value: 60 * 60, // 1 h
				},
			});
			return bkashIdToken;
		}

		if (bkashIdTokenTTl > 600) {
			return bkashIdToken;
		}

		const response = await fetch(
			`${config.bkash_base_url}/tokenized/checkout/token/grant`,
			{
				method: "POST",
				headers: {
					"content-type": "application/json",
					accept: "application/json",
					username: config.bkash_username,
					password: config.bkash_password,
				},
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

		await redisClient.set(IdTokenKey, result.id_token, {
			expiration: {
				type: "EX",
				value: 60 * 60, // 1 h
			},
		});

		await redisClient.set(RefreshTokenKey, result.refresh_token, {
			expiration: {
				type: "EX",
				value: 60 * 60 * 24 * 28, // 28 days
			},
		});

		bkashIdToken = result.id_token;

		return bkashIdToken;
	} catch (error: any) {
		throw new Error(error.message);
	}
};
