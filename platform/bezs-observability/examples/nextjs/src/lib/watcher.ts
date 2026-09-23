// watcher.ts — server-side Watcher24 client singleton.
// Import this in Server Components, Route Handlers, and Server Actions.
// Never import it in Client Components — use @watcher/nextjs/client hooks there.
//
// The globalThis cache prevents re-creating the client on every hot-reload in
// development, which would spin up many background flushers.
import { createNextServerClient } from "@watcher/nextjs/server";

declare global {
  // eslint-disable-next-line no-var
  var __watcher: ReturnType<typeof createNextServerClient> | undefined;
}

export const watcher =
  globalThis.__watcher ??
  (globalThis.__watcher = createNextServerClient({
    apiKey: process.env.W24_API_KEY ?? "",
    // appId links events to the registered application in the Watcher24 dashboard.
    // Get the ID from Settings → Apps.
    appId: process.env.W24_APP_ID,
    // serviceName labels this component so you can filter by service in the dashboard.
    // Change this to reflect what this Next.js instance is (e.g. "marketing-site", "dashboard-api").
    serviceName: process.env.W24_SERVICE_NAME ?? "nextjs-example",
    // gatewayUrl defaults to https://ingest.watcher24.io — only override for
    // local dev (http://localhost:8080) or self-hosted deployments.
    gatewayUrl: process.env.W24_GATEWAY_URL,
    environment: process.env.NODE_ENV ?? "development",
  }));
