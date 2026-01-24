/**
 * Vitest environment setup.
 *
 * Responsibilities:
 * - Loads `.env` (if present) for local runs.
 * - Forces `NODE_ENV=test` and provides reasonable defaults for required environment variables.
 * - If `DATABASE_URL_TEST` is set, it overrides `DATABASE_URL` so tests can
 *   point to an isolated database.
 *
 * Notes:
 * - This is intentionally lightweight and does not depend on `dotenv`.
 * - Keep this file deterministic: tests should not require manual environment setup.
 *
 * References:
 * - Vitest setup files: https://vitest.dev/config/#setupfiles
 * - The Twelve-Factor App (Config): https://12factor.net/config
 */

import fs from "node:fs";
import path from "node:path";

function loadDotEnv() {
	const envPath = path.join(process.cwd(), ".env");
	if (!fs.existsSync(envPath)) {
		return;
	}

	const content = fs.readFileSync(envPath, "utf8");
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) {
			continue;
		}
		const idx = line.indexOf("=");
		if (idx === -1) {
			continue;
		}
		const key = line.slice(0, idx).trim();
		let val = line.slice(idx + 1).trim();
		if (
			(val.startsWith('"') && val.endsWith('"')) ||
			(val.startsWith("'") && val.endsWith("'"))
		) {
			val = val.slice(1, -1);
		}
		if (process.env[key] === undefined) {
			process.env[key] = val;
		}
	}
}

loadDotEnv();

const dbTestUrl = process.env.DATABASE_URL_TEST;

if (dbTestUrl) {
	process.env.DATABASE_URL = dbTestUrl;
}

process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.API_VERSION = process.env.API_VERSION || "v1";

process.env.FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
process.env.ALLOWED_ORIGINS =
	process.env.ALLOWED_ORIGINS || "http://localhost:5024";
process.env.TRUST_PROXY = process.env.TRUST_PROXY || "false";

process.env.JWT_ACCESS_SECRET =
	process.env.JWT_ACCESS_SECRET || "test_access_secret";
process.env.JWT_REFRESH_SECRET =
	process.env.JWT_REFRESH_SECRET || "test_refresh_secret";
process.env.JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
process.env.JWT_REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

process.env.GMAIL_HOST = process.env.GMAIL_HOST || "smtp.gmail.com";
process.env.GMAIL_USER = process.env.GMAIL_USER || "test@example.com";
process.env.GMAIL_PASSWORD = process.env.GMAIL_PASSWORD || "testpassword";

process.env.EMAIL_VERIFICATION_EXPIRY =
	process.env.EMAIL_VERIFICATION_EXPIRY || "5m";

const emailRegex =
	/^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/;
if (
	process.env.MODERATOR_EMAIL &&
	!emailRegex.test(process.env.MODERATOR_EMAIL)
) {
	process.env.MODERATOR_EMAIL = "moderator@example.com";
}

if (process.env.MODERATOR_EMAIL && !process.env.MODERATOR_PASSWORD) {
	process.env.MODERATOR_PASSWORD = "testpassword";
}

process.env.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "test";
process.env.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || "test";
process.env.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || "test";

process.env.TEST_MODE = process.env.TEST_MODE || "";
