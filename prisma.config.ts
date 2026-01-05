/**
 * Prisma CLI configuration (Prisma 7+).
 *
 * Prisma 7 moved several configuration concerns out of schema.prisma and into prisma.config.ts
 *
 * References:
 * - Prisma configuration: https://www.prisma.io/docs/orm/reference/prisma-config-reference
 * - Migrate advisory locking: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
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
