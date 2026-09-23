// watcher.ts — browser-side Watcher24 client singleton.
// Uses a PUBLIC token (wpub_ prefix), which is safe to ship in browser bundles.
//
// Public tokens differ from server-side keys in three ways enforced by the gateway:
//   1. Origin allowlist — only requests from allowed origins are accepted.
//   2. Per-minute rate limit — caps burst abuse if the token leaks.
//   3. Write-only — the token cannot read data, only ingest events.
//
// The gateway resolves the linked application from the token itself, so no appId
// is needed here. Link the token to the same app as your server-side key in
// Settings → API Keys → Public Tokens so browser and server events are grouped
// together in the dashboard (browser events tagged source:"browser", server source:"server").
//
// Never use a server-side wt_ key here — only wpub_ tokens belong in the browser.
import { createBrowserClient } from "@watcher/browser";

export const watcherClient = createBrowserClient({
  // VITE_W24_PUBLIC_TOKEN must start with wpub_ — created in Settings → API Keys.
  apiKey: import.meta.env.VITE_W24_PUBLIC_TOKEN ?? "",
  // serviceName labels this component in the dashboard — filter by "react-client"
  // in the console to see browser events separately from the Express server.
  serviceName: "react-client",
  // gatewayUrl defaults to https://ingest.watcher24.io — only set for local dev or self-hosted.
  gatewayUrl: import.meta.env.VITE_W24_GATEWAY_URL,
  environment: import.meta.env.MODE,
});
