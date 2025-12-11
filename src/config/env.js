import { z } from "zod";
import { parseIntoArray } from "../utils/general.utils.js";

const envSchema = z.object({
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),
	DATABASE_URL: z
		.url("Field should be a database uri")
		.min(1, { error: "Field cannot be empty" }),
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
	GMAIL_HOST: z.string().min(1, { error: "Field cannot be empty" }),
	GMAIL_USER: z.email().min(1, { error: "Field cannot be empty" }),
	GMAIL_PASSWORD: z.string().min(1, { error: "Field cannot be empty" }),
	EMAIL_VERIFICATION_EXPIRY: z.string().default("5m"),
	CLOUDINARY_CLOUD_NAME: z.string().min(1, { error: "Field cannot be empty" }),
	CLOUDINARY_API_KEY: z.string().min(1, { error: "Field cannot be empty" }),
	CLOUDINARY_API_SECRET: z.string().min(1, { error: "Field cannot be empty" }),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	throw new Error(`Environment validation errors:\n\n${parsed.error}`);
}

export default parsed.data;
