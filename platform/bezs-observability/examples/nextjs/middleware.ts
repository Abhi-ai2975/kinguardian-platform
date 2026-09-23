// middleware.ts — Next.js Edge Middleware.
// watcherMiddleware auto-traces every matched request: method, path,
// status code, and duration appear as trace events in Watcher24.
// Wrap your own middleware logic inside it if needed.
import { watcherMiddleware } from "@watcher/nextjs";

export const middleware = watcherMiddleware({
  apiKey: process.env.W24_API_KEY ?? "",
  appId: process.env.W24_APP_ID ?? "bookmarks-server",
  gatewayUrl: process.env.W24_GATEWAY_URL ?? "http://localhost:8080",
  environment: process.env.NODE_ENV ?? "development",
});

// Only trace API routes — static files and pages don't need it.
export const config = {
  matcher: "/api/:path*",
};
