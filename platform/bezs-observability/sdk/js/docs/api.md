# Watcher SDK (JavaScript) — API Reference

## Key types

| Key prefix | Used with | `appId` needed? |
|------------|-----------|-----------------|
| `wt_...`   | Node.js / server SDKs | Only for legacy org-level keys. App-scoped keys resolve automatically. |
| `wpub_...` | Browser SDK | Never — gateway resolves the app from the token itself. |

Create keys and public tokens in **Settings → API Keys** in the console.

---

## Server client (Node.js)

```ts
import { createNodeClient } from "@watcher/node";

const client = createNodeClient({
  apiKey: "wt_...",            // required — server-side secret key
  // appId is optional: only set if using a legacy org-level key with no app linked.
  // App-scoped keys (the default) resolve the app automatically at the gateway.
  // appId: "billing-api",
  serviceName: "payment-api",  // optional — component label shown in the dashboard
  environment: "production",   // default: "production"
  gatewayUrl: "http://...",    // default: "http://localhost:8080"
  flushInterval: 500,          // ms between auto-flushes (default: 500)
  flushAt: 100,                // flush when buffer hits N events (default: 100)
  maxBuffer: 10_000,           // drop oldest if buffer exceeds this (default: 10000)
});
```

## Browser client (public token)

Public tokens (`wpub_` prefix) are safe to ship in browser bundles. The gateway
enforces an origin allowlist and a per-minute rate limit so a leaked token cannot
be abused at scale.

```ts
import { createBrowserClient } from "@watcher/browser";

const client = createBrowserClient({
  apiKey: "wpub_...",          // required — public token from Settings → API Keys
  // No appId needed: the gateway resolves the linked app from the token itself.
  serviceName: "react-frontend", // optional — component label shown in the dashboard
  environment: "production",   // default: "production"
  gatewayUrl: "http://...",    // default: "http://localhost:8080"
});
```

Events sent with a public token are tagged `source: "client"` by the gateway
(covering browser, mobile, and desktop uses of the same token type).
Events from a server-side key on the same app are tagged `source: "server"`.
Both appear together in the dashboard under the same application.
Use `serviceName` to distinguish sub-components (e.g. "react-frontend" vs "mobile-ios").

---

## Methods

### `client.audit(message, options?)`

```ts
client.audit("user.login", { userId: "u_123", payload: { method: "email" } });
client.audit("api_key.created", { userId: "u_789", sessionId: "s_001" });
```

---

### `client.log(severity, message, options?)`

**severity:** `"debug"` `"info"` `"warn"` `"error"` `"critical"`

```ts
client.log("info", "Request completed", { payload: { durationMs: 45 } });
client.log("error", "Payment failed", { payload: { orderId: "o_001" } });
```

---

### `client.trace(message, options?)`

```ts
client.trace("db.query", { traceId: "abc", spanId: "s1", payload: { table: "orders" } });
client.trace("http.request", { traceId: "abc", spanId: "s2", parentSpanId: "s1" });
```

---

### `client.metric(message, options?)`

```ts
client.metric("api.latency", { payload: { value: 123, unit: "ms" } });
client.metric("queue.depth", { payload: { value: 42, queue: "emails" } });
```

---

### `client.ai(severity, message, options?)` — server-side only

Records an AI agent event. Always include a `payload` with a `kind` field.
Available in `@watcher/node` and `@watcher/nextjs` server exports only.
For client-side AI interaction tracking use `audit()` from the browser SDK.

**severity:** `"debug"` `"info"` `"warn"` `"error"` `"critical"`

```ts
client.ai("info", "llm.call.completed", {
  traceId: workflowTraceId,
  spanId: `llm-${Date.now()}`,
  payload: {
    kind: "llm_call", provider: "openai", model: "gpt-4o",
    total_tokens: 1240, cost_usd: 0.0037, latency_ms: 820,
  },
});

client.ai("info", "tool.call.completed", {
  traceId: workflowTraceId,
  payload: { kind: "tool_call", tool_name: "web_search", latency_ms: 340, success: true },
});
```

The `EVENT_TYPE_AI` constant (`"ai"`) is exported from `@watcher/core` for use with the generic `event()` method.

---

### `client.event(eventType, severity, message, options?)`

Generic — use when typed helpers don't fit.

```ts
client.event("security", "critical", "Brute force detected", { payload: { ip: "1.2.3.4" } });
client.event("ai", "info", "Agent completed", { payload: { tokens: 1240 } });
```

---

### `client.flush()`

Immediately sends all buffered events. Returns a Promise.

```ts
await client.flush();
```

---

### `client.shutdown()`

Flushes and stops the background flusher. Call before process exit.

```ts
await client.shutdown();
```

---

## React Hooks (`@watcher/react`)

```tsx
import { WatcherProvider, useWatcher, useAudit, useLog } from "@watcher/react";

// Wrap your app
<WatcherProvider client={client}>...</WatcherProvider>

// Inside any component
const client = useWatcher();
const audit = useAudit();   // pre-bound client.audit
const log = useLog();       // pre-bound client.log

audit("user.clicked", { payload: { button: "checkout" } });
log("warn", "Cart empty at checkout");
```

---

## Next.js Middleware (`@watcher/nextjs`)

```ts
// middleware.ts (project root)
import { watcherMiddleware } from "@watcher/nextjs";

export const middleware = watcherMiddleware({
  apiKey: process.env.W24_API_KEY!,
  // appId is optional — only for legacy org-level keys. App-scoped keys resolve automatically.
});

export const config = { matcher: "/api/:path*" };
```
