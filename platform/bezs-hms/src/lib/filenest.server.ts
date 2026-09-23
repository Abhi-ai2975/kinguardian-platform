/**
 * FileNest Node.js client singleton.
 *
 * Layer: lib / infrastructure
 *
 * Provides a single server-side FileNest client instance reused across hot-
 * reloads in development and across requests in production. Mirrors the same
 * singleton pattern used for the Prisma client in lib/db.ts.
 *
 * Import this in API route handlers, server actions, and server components
 * that need to call the FileNest API (folder management, download URLs, etc.).
 * Never import this in client components.
 */

import "server-only";
import { FileNest } from "@filenest-fs/node";

const globalForFileNest = globalThis as unknown as {
  fileNest: FileNest | undefined;
};

/**
 * Creates a new FileNest client from environment variables.
 * FILENEST_API_KEY and FILENEST_PROJECT_ID must be set.
 */
function createFileNestClient(): FileNest {
  return new FileNest({
    apiKey: process.env.FILENEST_API_KEY!,
    projectId: process.env.FILENEST_PROJECT_ID!,
    baseUrl: process.env.FILENEST_API_URL,
  });
}

/**
 * The application-wide FileNest server client.
 * Import this wherever server-side FileNest API calls are needed.
 */
export const filenest = globalForFileNest.fileNest ?? createFileNestClient();

if (process.env.NODE_ENV !== "production") globalForFileNest.fileNest = filenest;
