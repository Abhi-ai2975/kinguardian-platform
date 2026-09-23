/**
 * @watcher/nextjs main entry — safe to import in middleware.ts and server-only code.
 *
 * For use in specific contexts import the sub-path instead:
 *   import { createNextServerClient } from "@watcher/nextjs/server"   ← Server Components, Route Handlers
 *   import { WatcherProvider, useAudit } from "@watcher/nextjs/client" ← Client Components ("use client")
 */
export { watcherMiddleware, type WatcherMiddlewareOptions } from "./middleware.js";
export { createNextServerClient } from "./server.js";
export type { ClientOptions } from "@watcher/core";
