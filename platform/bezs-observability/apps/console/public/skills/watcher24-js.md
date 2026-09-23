# Watcher24 JavaScript / Node.js SDK — AI Skill

Use this file as context when writing code that integrates Watcher24 into a
JavaScript, TypeScript, Node.js, React, or Next.js application.

---

## Packages

| Package | Where to use |
|---------|-------------|
| `@watcher/node` | Node.js servers, scripts, workers |
| `@watcher/browser` | Browser bundles (vanilla JS / Vite) |
| `@watcher/react` | React apps — provides hooks |
| `@watcher/nextjs` | Next.js — middleware, server, client exports |
| `@watcher/core` | Internal — do not import directly |

## Installation

```bash
# Node.js server
npm install @watcher/node

# React SPA
npm install @watcher/browser @watcher/react

# Next.js
npm install @watcher/nextjs
```

## Rules the AI must follow

1. **One client per process** — create a singleton, never call `createNodeClient` inside a function that runs on every request.
2. **Always call `shutdown()` before process exit** — register a SIGTERM/SIGINT handler or `atexit` equivalent.
3. **Never hardcode `apiKey`** — always read from `process.env.W24_API_KEY`.
4. **Never import `@watcher/node` in client components** — use `@watcher/browser` or `@watcher/react` hooks instead.
5. **Use typed helpers** (`audit`, `log`, `trace`, `metric`) — never call the generic `event()` unless a typed helper doesn't fit.
6. **Include `userId` on all `audit()` calls** — audit events without a userId are useless for compliance.
7. **Wrap errors with `log("error", ...)`** — never swallow errors silently.

## Node.js singleton pattern

```typescript
// lib/watcher.ts
import { createNodeClient } from "@watcher/node";

export const watcher = createNodeClient({
  apiKey: process.env.W24_API_KEY ?? "",
  appId: process.env.W24_APP_ID ?? "my-service",
  gatewayUrl: process.env.W24_GATEWAY_URL ?? "http://localhost:8080",
  environment: process.env.NODE_ENV ?? "production",
});

// Always register — prevents event loss on shutdown
process.on("SIGTERM", () => watcher.shutdown());
process.on("SIGINT",  () => watcher.shutdown());
```

## Next.js singleton (hot-reload safe)

```typescript
// lib/watcher.ts
import { createNextServerClient } from "@watcher/nextjs/server";

declare global { var __watcher: ReturnType<typeof createNextServerClient> | undefined; }

export const watcher =
  globalThis.__watcher ??
  (globalThis.__watcher = createNextServerClient({
    apiKey: process.env.W24_API_KEY ?? "",
    appId: process.env.W24_APP_ID ?? "my-app",
    environment: process.env.NODE_ENV ?? "production",
  }));
```

## React setup

```tsx
// main.tsx or providers.tsx
import { createBrowserClient } from "@watcher/browser";
import { WatcherProvider } from "@watcher/react";

const watcherClient = createBrowserClient({
  apiKey: import.meta.env.VITE_W24_API_KEY ?? "",
  appId: import.meta.env.VITE_W24_APP_ID ?? "my-app",
});

<WatcherProvider client={watcherClient}>
  <App />
</WatcherProvider>
```

## All SDK methods with signatures

```typescript
// Audit — user actions, compliance trail
watcher.audit(message: string, options?: {
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  payload?: Record<string, unknown>;
}): void

// Log — application events
watcher.log(severity: string, message: string, options?: {
  traceId?: string;
  spanId?: string;
  payload?: Record<string, unknown>;
}): void
// severity: "debug" | "info" | "warn" | "error" | "critical"

// Trace — distributed spans
watcher.trace(message: string, options?: {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
  payload?: Record<string, unknown>;
}): void

// Metric — numeric measurements
watcher.metric(message: string, options?: {
  payload?: Record<string, unknown>; // put { value: number } here
}): void

// Lifecycle
watcher.flush(): Promise<void>
watcher.shutdown(): Promise<void>
```

## React hooks

```typescript
import { useAudit, useLog, useTrace, useMetric } from "@watcher/react";

const audit  = useAudit();
const log    = useLog();
const trace  = useTrace();
const metric = useMetric();

// Usage
audit("user.login", { userId, payload: { email } });
log("error", "fetch.failed", { payload: { url, status } });
trace("ui.page_view", { payload: { page: "/dashboard" } });
metric("cart.items", { payload: { value: cart.length } });
```

## Next.js middleware auto-tracing

```typescript
// middleware.ts (root of project)
import { watcherMiddleware } from "@watcher/nextjs";

export const middleware = watcherMiddleware({
  apiKey: process.env.W24_API_KEY ?? "",
  appId: process.env.W24_APP_ID ?? "my-app",
});

export const config = { matcher: "/api/:path*" };
```

## Common patterns

### Express request tracing
```typescript
app.use((req, res, next) => {
  const traceId = req.headers["x-trace-id"] as string ?? crypto.randomUUID();
  const start = Date.now();
  res.on("finish", () => {
    watcher.trace("http.request", {
      traceId,
      payload: { method: req.method, path: req.path, status: res.statusCode, durationMs: Date.now() - start },
    });
  });
  (req as any).traceId = traceId;
  next();
});
```

### Audit login / logout
```typescript
watcher.audit("user.login", {
  userId,
  payload: { email, ip: req.ip },
});

watcher.audit("user.logout", { userId, payload: {} });
```

### Error handler
```typescript
app.use((err: Error, req, res, next) => {
  watcher.log("error", "unhandled.error", {
    payload: { message: err.message, stack: err.stack },
  });
  res.status(500).json({ error: "internal server error" });
});
```

### Metric on CRUD
```typescript
// After create
watcher.metric("records.total", { payload: { value: await db.count() } });

// Timing
const start = Date.now();
const result = await db.query(sql);
watcher.metric("db.query.duration_ms", { payload: { value: Date.now() - start, query: "getUser" } });
```

## Environment variables

```bash
W24_API_KEY=wtch_...                     # required, server-side only
W24_APP_ID=my-service                    # required
W24_GATEWAY_URL=http://localhost:8080    # optional, default shown
W24_ENVIRONMENT=production               # optional

# Browser / Next.js public
NEXT_PUBLIC_W24_API_KEY=wtch_pub_...
NEXT_PUBLIC_W24_GATEWAY_URL=https://ingest.watcher24.io
VITE_W24_API_KEY=wtch_pub_...
VITE_W24_GATEWAY_URL=https://ingest.watcher24.io
```

## Do NOT do these

```typescript
// ❌ Creating client inside a request handler
app.post("/api/event", (req, res) => {
  const w = createNodeClient({ ... }); // spawns new flusher on every request!
  w.audit("...");
});

// ❌ Hardcoded key
const watcher = createNodeClient({ apiKey: "wtch_abc123", ... });

// ❌ Missing shutdown
// Process exits, 500ms flush window missed, events lost.

// ❌ Importing node client in browser
import { createNodeClient } from "@watcher/node"; // uses node:https — crashes in browser

// ❌ Audit without userId
watcher.audit("user.deleted", { payload: { id } }); // who deleted it?
```
