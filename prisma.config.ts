/**
 * Prisma CLI configuration (Prisma 7+).
 *
 * Prisma 7 moved several configuration concerns out of `schema.prisma` and into
 * `prisma.config.ts` (notably datasource URL wiring and seeding command).
 *
 * References:
 * - Prisma configuration: https://www.prisma.io/docs/orm/prisma-schema/overview/prisma-config
 * - Migrate advisory locking: https://pris.ly/d/migrate-advisory-locking
 */

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
	schema: "prisma/schema.prisma",
	migrations: {
		path: "prisma/migrations",
		seed: "node --experimental-strip-types prisma/seed.js",
	},
	datasource: {
		url: env("DATABASE_URL"),
	},
});
