# Watcher SDK (JavaScript) — Overview

## What Is This?

The JavaScript SDK sends telemetry to the Watcher24 gateway from any JavaScript
runtime — Node.js servers, browsers, React apps, and Next.js projects.

---

## Packages

| Package | Runtime | What it provides |
|---------|---------|-----------------|
| `@watcher/core` | Any | Core client, buffer, flusher, types |
| `@watcher/node` | Node.js | HTTP transport + `createNodeClient()` |
| `@watcher/browser` | Browser | fetch/sendBeacon transport + `createBrowserClient()` |
| `@watcher/react` | React | `WatcherProvider`, `useWatcher()`, `useAudit()`, `useLog()` |
| `@watcher/nextjs` | Next.js | Server middleware + client provider |

---

## Quick Start

**Node.js:**
```ts
import { createNodeClient } from "@watcher/node";

const client = createNodeClient({
  apiKey: "wtch_...",
  appId: "billing-api",
  environment: "production",
});

client.audit("user.login", { userId: "u_123", payload: { method: "email" } });
client.log("warn", "Slow query", { payload: { durationMs: 450 } });

process.on("beforeExit", () => client.shutdown());
```

**React:**
```tsx
import { WatcherProvider, useAudit } from "@watcher/react";
import { createBrowserClient } from "@watcher/browser";

const client = createBrowserClient({ apiKey: "wtch_...", appId: "my-app" });

export function App() {
  return (
    <WatcherProvider client={client}>
      <MyApp />
    </WatcherProvider>
  );
}

function LoginButton() {
  const audit = useAudit();
  return <button onClick={() => audit("user.login")}>Login</button>;
}
```

**Next.js:**
```ts
// middleware.ts
import { watcherMiddleware } from "@watcher/nextjs";
export const middleware = watcherMiddleware({ apiKey: "wtch_...", appId: "my-app" });
export const config = { matcher: "/api/:path*" };
```

---

## Internal Flow

```
client.audit(...)
  ↓
CaptureEventUseCase — validates, builds EventInput
  ↓
EventBuffer — thread-safe (mutex-free, single-threaded JS event loop)
  ↓
BackgroundFlusher — setInterval (500ms) OR size threshold (100 events)
  ↓
Transport.send() — HTTP POST /v1/events (batched)
  ↓
Retry with exponential backoff on failure
```

---

## Where It Fits

```
Browser / Node.js / Next.js
  ↓  client.audit() / client.log() / etc.
Watcher JS SDK     ← this package
  ↓  HTTP POST /v1/events (batched)
Go Gateway
  ↓  Redis Streams → Python Worker → ClickHouse
```
