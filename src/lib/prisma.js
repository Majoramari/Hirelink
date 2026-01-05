/**
 * Prisma client (single shared instance).
 *
 * Exposes a single PrismaClient instance used across services/middleware.
 *
 * Notes:
 * - The project uses Prisma 7 with a driver adapter for Postgres.
 * - Keeping Prisma initialization in one module avoids creating too many database connections.
 *
 * References:
 * - Prisma configuration: https://www.prisma.io/docs/orm/reference/prisma-config-reference
 * - Migrate advisory locking: https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7
 */

import { PrismaPg } from "@prisma/adapter-pg";
import env from "../config/env.js";
import { PrismaClient } from "../generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;
