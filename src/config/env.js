/**
 * Environment configuration.
 *
 * Responsibilities:
 * - Parses process environment variables once at startup.
 * - Validates required variables and their formats with Zod.
 * - Normalizes values (for example, splitting comma-separated lists and parsing numbers).
 * - Exposes a single `env` object (loosely typed) that is imported across the application.
 *
 * Why this exists:
 * - It prevents unclear runtime failures by failing fast at startup if config is missing.
 * - It centralizes config logic so services/controllers do not access `process.env` directly.
 *
 * References:
 * - The Twelve-Factor App (Config): https://12factor.net/config
 * - Zod: https://zod.dev/
 */

import { z } from "zod";
import { parseIntoArray } from "../utils/general.utils.js";

const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.default("development"),
		DATABASE_URL: z
			.url("Field should be a database uri")
			.min(1, { error: "Field cannot be empty" }),
		DATABASE_URL_TEST: z.url("Field should be a database uri").optional(),
		PORT: z.preprocess((val) => Number(val), z.number()).default(3000),
		API_VERSION: z.string().default("v1"),
		FRONTEND_URL: z
			.url("Field should be a url")
			.min(1, { error: "Field cannot be empty" }),
		ALLOWED_ORIGINS: z
			.string()
			.min(1, { error: "Field cannot be empty" })
			.transform(parseIntoArray),
		JWT_ACCESS_SECRET: z.string().min(1, { error: "Field cannot be empty" }),
		JWT_ACCESS_EXPIRY: z.string().default("15m"),
		JWT_REFRESH_SECRET: z.string().min(1, { error: "Field cannot be empty" }),
		JWT_REFRESH_EXPIRY: z.string().default("7d"),
		TRUST_PROXY: z.preprocess((val) => {
			if (val === undefined) {
				return false;
			}
			const s = String(val).toLowerCase();
			return s === "true" || s === "1" || s === "yes";
		}, z.boolean()),
		LOG_LEVEL: z.string().optional(),
		GMAIL_HOST: z.string().min(1, { error: "Field cannot be empty" }),
		GMAIL_USER: z.email().min(1, { error: "Field cannot be empty" }),
		GMAIL_PASSWORD: z.string().min(1, { error: "Field cannot be empty" }),
		EMAIL_VERIFICATION_EXPIRY: z.string().default("5m"),
		EMAIL_SEND: z.preprocess((val) => {
			if (val === undefined) {
				return false;
			}
			const s = String(val).toLowerCase();
			return s === "true" || s === "1" || s === "yes";
		}, z.boolean()),
		MODERATOR_EMAIL: z.email().optional(),
		MODERATOR_PASSWORD: z.string().min(1).optional(),
		CLOUDINARY_CLOUD_NAME: z
			.string()
			.min(1, { error: "Field cannot be empty" }),
		CLOUDINARY_API_KEY: z.string().min(1, { error: "Field cannot be empty" }),
		CLOUDINARY_API_SECRET: z
			.string()
			.min(1, { error: "Field cannot be empty" }),
	})
	.superRefine((data, ctx) => {
		const hasModeratorEmail = Boolean(data.MODERATOR_EMAIL);
		const hasModeratorPassword = Boolean(data.MODERATOR_PASSWORD);

		if (hasModeratorEmail !== hasModeratorPassword) {
			ctx.addIssue({
				code: "custom",
				path: ["MODERATOR_EMAIL"],
				message: "MODERATOR_EMAIL and MODERATOR_PASSWORD must be set together",
			});
			ctx.addIssue({
				code: "custom",
				path: ["MODERATOR_PASSWORD"],
				message: "MODERATOR_EMAIL and MODERATOR_PASSWORD must be set together",
			});
		}
	});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	throw new Error(`Environment validation errors:\n\n${parsed.error}`);
}

export default parsed.data;
