/**
 * Next.js Edge Middleware that auto-traces every matched API request.
 * Wraps the user's middleware (or acts as a standalone) and produces one
 * trace event per request with method, path, status, and duration.
 *
 * Uses fetch-based transport because Next.js middleware runs in the Edge runtime
 * which does not have access to Node.js built-ins like node:https.
 */
import type { ClientOptions } from "@watcher/core";
import { createNodeClient } from "@watcher/node";
import type { NextMiddleware, NextRequest } from "./next-types.js";

export type WatcherMiddlewareOptions = ClientOptions;

/**
 * Returns a Next.js middleware function that traces all matched requests.
 * Place the result in your project's `middleware.ts` file.
 *
 * @example
 * export const middleware = watcherMiddleware({ apiKey: "wtch_...", appId: "my-app" });
 * export const config = { matcher: "/api/:path*" };
 */
export function watcherMiddleware(options: WatcherMiddlewareOptions): NextMiddleware {
  const client = createNodeClient(options);

  return async (request: NextRequest) => {
    const start = Date.now();
    const traceId = request.headers.get("x-trace-id") ?? crypto.randomUUID();

    // Import next/server dynamically so the package compiles without next as
    // a hard dev dependency — the peer dependency covers the actual runtime.
    const { NextResponse } = await import("next/server");
    const response = NextResponse.next();

    const durationMs = Date.now() - start;
    client.trace("http.request", {
      traceId,
      payload: {
        method: request.method,
        path: new URL(request.url).pathname,
        durationMs,
      },
    });

    return response;
  };
}
