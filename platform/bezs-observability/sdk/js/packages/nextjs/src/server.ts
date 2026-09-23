/**
 * Server-side client for Next.js — use in Server Components, Route Handlers,
 * and Server Actions. Uses the Node.js transport (node:https).
 *
 * Create a singleton in a shared module (e.g. lib/watcher.ts) and import it
 * from all server-side code. Never import this in Client Components.
 */
import { createNodeClient } from "@watcher/node";
import type { ClientOptions } from "@watcher/core";

export type { ClientOptions };

/**
 * Create a Watcher client for Next.js server-side code.
 * Identical to createNodeClient — named separately so import intent is clear.
 */
export const createNextServerClient = createNodeClient;
