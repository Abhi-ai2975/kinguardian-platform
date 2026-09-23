# React Native SDK — Implementation Plan

> Grounded in the actual codebase as of 2026-05-31.
> Reference `sdk/js/packages/core/src/` for patterns to follow.

---

## Codebase Baseline

| What | Where | Status |
|------|-------|--------|
| Core SDK client with `captureTyped` pattern | `sdk/js/packages/core/src/client.ts` | ✅ exists — RN SDK extends this |
| Browser transport (fetch + public token) | `sdk/js/packages/browser/src/transport.ts` | ✅ exists — RN transport is similar |
| Node transport | `sdk/js/packages/node/src/transport.ts` | ✅ exists |
| React Native example app | `examples/react-native/` | ✅ exists — currently uses placeholder |
| JS SDK workspace (`pnpm-workspace.yaml`) | root | ✅ exists — add RN package to workspace |

---

## Step 1 — Package Scaffold

**Create** `sdk/react-native/` with this structure:

```
sdk/react-native/
├── src/
│   ├── client.ts         — WatcherClient class
│   ├── transport.ts      — fetch transport with batch queue
│   ├── offline-queue.ts  — AsyncStorage offline buffer
│   ├── device-info.ts    — device context collection
│   ├── app-state.ts      — AppState listener
│   ├── context.tsx       — WatcherProvider + useWatcher hook
│   └── index.ts          — public exports
├── docs/
│   └── api.md
├── package.json
├── tsconfig.json
└── README.md
```

**File:** `sdk/react-native/package.json`

```json
{
  "name": "@watcher/react-native",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "peerDependencies": {
    "react": ">=18",
    "react-native": ">=0.70",
    "@react-native-async-storage/async-storage": ">=1.19",
    "react-native-device-info": ">=10"
  },
  "peerDependenciesMeta": {
    "react-native-device-info": { "optional": true }
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/react-native": "^0.72"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  }
}
```

Add to the root `pnpm-workspace.yaml`:
```yaml
packages:
  - sdk/js/packages/*
  - sdk/react-native        # add this
```

---

## Step 2 — Transport

**Create** `sdk/react-native/src/transport.ts`

The transport holds the live in-memory queue and sends batches to the gateway.

```typescript
interface TransportOptions {
  gatewayUrl:    string;
  publicToken:   string;
  batchSize:     number;      // default 20
  flushInterval: number;      // ms, default 10_000
}

export class BatchTransport {
  private queue: EventPayload[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(private opts: TransportOptions) {
    this.timer = setInterval(() => this.flush(), opts.flushInterval);
  }

  enqueue(event: EventPayload): void {
    this.queue.push(event);
    if (this.queue.length >= this.opts.batchSize) this.flush();
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    const batch = this.queue.splice(0);        // drain queue atomically
    try {
      await fetch(`${this.opts.gatewayUrl}/v1/events/batch`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${this.opts.publicToken}`,
        },
        body: JSON.stringify({ events: batch }),
      });
    } catch {
      // Re-queue on failure so events aren't lost on transient network errors.
      // Limit re-queue to avoid memory growth on persistent failure.
      if (this.queue.length < 200) this.queue.unshift(...batch);
    }
  }

  destroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
```

---

## Step 3 — Offline Queue

**Create** `sdk/react-native/src/offline-queue.ts`

Wraps `@react-native-async-storage/async-storage`. Gracefully degrades if not installed.

```typescript
const STORAGE_KEY = "@watcher/queue";
const MAX_SIZE = 500;

export async function enqueueOffline(event: EventPayload): Promise<void> {
  const AsyncStorage = tryImportAsyncStorage();
  if (!AsyncStorage) return;
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const existing: EventPayload[] = raw ? JSON.parse(raw) : [];
  const updated = [...existing, event].slice(-MAX_SIZE);   // keep newest MAX_SIZE
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function drainOfflineQueue(): Promise<EventPayload[]> {
  const AsyncStorage = tryImportAsyncStorage();
  if (!AsyncStorage) return [];
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  await AsyncStorage.removeItem(STORAGE_KEY);
  return JSON.parse(raw);
}

function tryImportAsyncStorage() {
  try {
    return require("@react-native-async-storage/async-storage").default;
  } catch {
    return null;   // optional peer dep not installed — offline queue disabled
  }
}
```

---

## Step 4 — Device Info

**Create** `sdk/react-native/src/device-info.ts`

Reads from `react-native-device-info` (optional) and `react-native`'s `Platform` (always available).

```typescript
import { Platform } from "react-native";

interface DeviceContext {
  device_platform:   string;
  device_os_version: string;
  device_model?:     string;
  app_version?:      string;
  app_build?:        string;
  is_emulator?:      boolean;
}

export async function getDeviceContext(): Promise<DeviceContext> {
  const ctx: DeviceContext = {
    device_platform:   Platform.OS,
    device_os_version: String(Platform.Version),
  };

  try {
    const DeviceInfo = require("react-native-device-info");
    ctx.device_model  = await DeviceInfo.getModel();
    ctx.app_version   = DeviceInfo.getVersion();
    ctx.app_build     = DeviceInfo.getBuildNumber();
    ctx.is_emulator   = await DeviceInfo.isEmulator();
  } catch {
    // react-native-device-info not installed — skip optional fields
  }

  return ctx;
}
```

Cache the result after first call — device context doesn't change during a session.

---

## Step 5 — App State Listener

**Create** `sdk/react-native/src/app-state.ts`

```typescript
import { AppState, AppStateStatus } from "react-native";

export function registerAppStateListener(
  onForeground: () => void,
  onBackground: () => void,
): () => void {
  const subscription = AppState.addEventListener(
    "change",
    (nextState: AppStateStatus) => {
      if (nextState === "active")     onForeground();
      if (nextState === "background") onBackground();
    }
  );
  return () => subscription.remove();
}
```

---

## Step 6 — Main Client

**Create** `sdk/react-native/src/client.ts`

```typescript
export interface WatcherClientOptions {
  publicToken:    string;
  serviceName:    string;
  environment?:   string;   // default: 'production'
  gatewayUrl?:    string;   // default: 'https://gateway.watcher24.com'
  batchSize?:     number;   // default: 20
  flushInterval?: number;   // default: 10_000 ms
  offlineStorage?: boolean; // default: true
  debug?:         boolean;  // default: false
}

export class WatcherClient {
  private transport:    BatchTransport;
  private deviceCtx:   DeviceContext | null = null;
  private userId:      string | null = null;
  private cleanupFn:   () => void;

  constructor(private opts: WatcherClientOptions) {
    this.transport = new BatchTransport({
      gatewayUrl:    opts.gatewayUrl ?? "https://gateway.watcher24.com",
      publicToken:   opts.publicToken,
      batchSize:     opts.batchSize ?? 20,
      flushInterval: opts.flushInterval ?? 10_000,
    });

    // Start device context collection asynchronously.
    getDeviceContext().then((ctx) => { this.deviceCtx = ctx; });

    // Register AppState listener.
    this.cleanupFn = registerAppStateListener(
      async () => {
        // Foreground: drain offline queue first, then live queue.
        if (opts.offlineStorage !== false) {
          const offline = await drainOfflineQueue();
          offline.forEach((e) => this.transport.enqueue(e));
        }
        await this.transport.flush();
      },
      () => this.transport.flush(),
    );
  }

  identify(userId: string, _traits?: Record<string, unknown>): void {
    this.userId = userId;
  }

  log(severity: string, message: string, options: CaptureOptions = {}): void {
    this.capture("log", severity, message, options);
  }

  audit(message: string, options: CaptureOptions = {}): void {
    this.capture("audit", "info", message, options);
  }

  trace(severity: string, message: string, options: CaptureOptions = {}): void {
    this.capture("trace", severity, message, options);
  }

  metric(name: string, value: number, options: CaptureOptions = {}): void {
    this.capture("metric", "info", name, { ...options, payload: { value, ...options.payload } });
  }

  ai(severity: string, message: string, options: CaptureOptions = {}): void {
    this.capture("ai", severity, message, options);
  }

  private capture(eventType: string, severity: string, message: string, options: CaptureOptions): void {
    const event: EventPayload = {
      event_type:   eventType,
      severity,
      message,
      timestamp:    new Date().toISOString(),
      service_name: this.opts.serviceName,
      environment:  this.opts.environment ?? "production",
      user_id:      options.userId ?? this.userId ?? undefined,
      trace_id:     options.traceId,
      span_id:      options.spanId,
      parent_span_id: options.parentSpanId,
      payload: { ...this.deviceCtx, ...options.payload },
    };
    this.transport.enqueue(event);
  }

  async flush(): Promise<void> {
    await this.transport.flush();
  }

  shutdown(): void {
    this.transport.flush();
    this.transport.destroy();
    this.cleanupFn();
  }
}
```

---

## Step 7 — React Context

**Create** `sdk/react-native/src/context.tsx`

```typescript
import React, { createContext, useContext } from "react";
import { WatcherClient } from "./client";

const WatcherContext = createContext<WatcherClient | null>(null);

export function WatcherProvider({
  client,
  children,
}: {
  client: WatcherClient;
  children: React.ReactNode;
}) {
  return (
    <WatcherContext.Provider value={client}>
      {children}
    </WatcherContext.Provider>
  );
}

export function useWatcher(): WatcherClient {
  const client = useContext(WatcherContext);
  if (!client) throw new Error("useWatcher must be used inside <WatcherProvider>");
  return client;
}
```

---

## Step 8 — Exports

**Create** `sdk/react-native/src/index.ts`:

```typescript
export { WatcherClient }    from "./client";
export { WatcherProvider, useWatcher } from "./context";
export type { WatcherClientOptions, CaptureOptions } from "./client";
```

---

## Step 9 — Update Example App

**File:** `examples/react-native/package.json`

Replace the placeholder SDK import with `@watcher/react-native` (local workspace reference):
```json
{
  "dependencies": {
    "@watcher/react-native": "workspace:*"
  }
}
```

**File:** `examples/react-native/App.tsx`

Update to use the real SDK — show `WatcherProvider`, `useWatcher`, `identify`, and event capture in the example navigation flows.

**File:** `examples/react-native/lib/watcher.ts` (create if not exists)

```typescript
import { WatcherClient } from "@watcher/react-native";

export const watcher = new WatcherClient({
  publicToken:  process.env.EXPO_PUBLIC_WATCHER_TOKEN ?? "",
  serviceName:  "react-native-example",
  environment:  __DEV__ ? "development" : "production",
});
```

---

## Step 10 — Docs Sync (Rule 10)

| Step | Docs to update |
|------|---------------|
| SDK API surface | `sdk/react-native/docs/api.md` (create) |
| Console MDX | `apps/console/src/content/docs/sdks/react-native.mdx` — update from placeholder to real API docs |
| Docs nav | `apps/console/src/lib/docs-nav.ts` — `/docs/sdks/react-native` already in nav, ensure it points to real MDX |
| Example `.env.example` | `examples/react-native/.env.example` — document `EXPO_PUBLIC_WATCHER_TOKEN` |

---

## Implementation Order Summary

```
1. sdk/react-native/package.json
2. sdk/react-native/tsconfig.json
3. sdk/react-native/src/transport.ts
4. sdk/react-native/src/offline-queue.ts
5. sdk/react-native/src/device-info.ts
6. sdk/react-native/src/app-state.ts
7. sdk/react-native/src/client.ts
8. sdk/react-native/src/context.tsx
9. sdk/react-native/src/index.ts
10. root pnpm-workspace.yaml  (add sdk/react-native)
11. examples/react-native/  (update to real SDK)
12. sdk/react-native/docs/api.md
13. apps/console/src/content/docs/sdks/react-native.mdx
```

---

## Key Constraints

- **Never use a secret key in the React Native app.** App bundles are extractable. Only `wpub_` public tokens.
- **`react-native-device-info` is optional** — wrap all calls in `try/catch`. The SDK must work without it.
- **The offline queue cap is 500 events.** Exceed it and oldest events are dropped. Document this limit clearly.
- **`AppState` listener must be removed on `shutdown()`** — memory leak otherwise.
- **Device context is async** — the first few events captured before `getDeviceContext()` resolves will not have device fields. This is acceptable. Do not block `capture()` on the async device info call.
- **Use `pnpm`** for the workspace — never `npm` or `yarn` (Rule 8).
