/**
 * Prisma client singleton.
 *
 * Layer: lib / infrastructure
 *
 * Prisma v7 with the `prisma-client` generator requires a driver adapter.
 * We use `@prisma/adapter-pg` (a pg Pool) for server-side Node.js usage.
 *
 * Ensures only one PrismaClient + Pool exists across hot-reloads in
 * development. In production each request reuses the same instance.
 */

import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

/**
 * The application-wide Prisma client.
 * Import this in every service that needs database access.
 */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
