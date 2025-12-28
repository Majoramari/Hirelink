/**
 * Prisma client singleton.
 *
 * Exposes a single PrismaClient instance used across services/middleware.
 *
 * Notes:
 * - The project uses Prisma 7 with a driver adapter for Postgres.
 * - Keeping Prisma initialization in one module avoids creating too many DB connections.
 *
 * References:
 * - Prisma Client: https://www.prisma.io/docs/orm/prisma-client
 * - Driver adapters: https://www.prisma.io/docs/orm/prisma-client/driver-adapters
 */

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import env from "../config/env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;
