# React Native SDK — Watcher24

## Purpose

The React Native SDK allows mobile app developers to instrument their React Native apps with the same event types (logs, audit, traces, metrics, AI) as the server-side SDKs. It fills the gap between the browser SDK (which works in web contexts) and a native mobile approach that handles mobile-specific concerns:

- **Offline queue** — events sent while the device is offline are buffered locally (AsyncStorage) and flushed when connectivity is restored
- **App state awareness** — background vs foreground transitions are tracked; the queue is flushed on foreground resume
- **Device context** — platform, OS version, app version, and device model are automatically attached to every event
- **Battery-aware batching** — events are batched to reduce network calls and battery drain; default batch size 20, max wait 10 seconds
- **Public token support** — uses the same `wpub_` browser-safe token as the web SDK, never requiring a secret key inside the app bundle

---

## How It Differs from the Browser and Node SDKs

| Concern | Browser SDK | Node SDK | React Native SDK |
|---------|------------|---------|-----------------|
| Transport | `fetch` | `fetch` / `http` | `fetch` (RN fetch) |
| Offline support | None — browser assumes connectivity | None | AsyncStorage queue |
| Batching | No | No | Yes — 20 events or 10s, whichever first |
| Device info | `navigator.userAgent` | `process.platform` | `Platform`, `react-native-device-info` |
| App state | N/A | N/A | `AppState` API |
| Background flush | N/A | N/A | Flush on foreground resume |
| Rate limiting | Yes (public token cap) | No | Yes (same public token cap) |

---

## Package Location

```
sdk/react-native/
```

Published as `@watcher/react-native` on npm (separate package from `@watcher/browser` and `@watcher/node`).

---

## API Surface

### Installation

```bash
pnpm add @watcher/react-native react-native-device-info @react-native-async-storage/async-storage
```

Peer dependencies: `react-native >= 0.70`, `react` >= 18.

### Initialization

```typescript
import { WatcherClient } from "@watcher/react-native";

const watcher = new WatcherClient({
  publicToken:  "wpub_...",        // browser-safe public token (never a secret key)
  serviceName:  "mobile-app",
  environment:  __DEV__ ? "development" : "production",
  batchSize:    20,                // flush when queue reaches this size
  flushInterval: 10_000,          // also flush every 10 seconds
  offlineStorage: true,           // buffer events to AsyncStorage when offline
  debug:        __DEV__,          // log SDK internals in development
});
```

Call once in your app entry point (`App.tsx` or `index.js`). The client is a singleton — pass it via React context or export it directly.

### React Context (recommended)

```typescript
// lib/watcher.ts
import { WatcherClient, WatcherProvider, useWatcher } from "@watcher/react-native";

export const watcher = new WatcherClient({ publicToken: "wpub_...", serviceName: "mobile-app" });
export { WatcherProvider, useWatcher };

// App.tsx
import { watcher, WatcherProvider } from "./lib/watcher";

export default function App() {
  return (
    <WatcherProvider client={watcher}>
      <NavigationContainer>
        {...}
      </NavigationContainer>
    </WatcherProvider>
  );
}

// AnyScreen.tsx
import { useWatcher } from "./lib/watcher";

function ProfileScreen() {
  const watcher = useWatcher();
  watcher.log("info", "profile.viewed");
}
```

### Event methods

All methods match the JS/Node SDK API — same method names, same options.

```typescript
// Log
watcher.log("info", "user.signed_in", {
  userId:  session.userId,
  payload: { method: "google_oauth" },
});

// Audit
watcher.audit("user.settings_changed", {
  userId:  session.userId,
  payload: { changed: ["notifications", "theme"] },
});

// Trace
watcher.trace("info", "api.request", {
  traceId:  requestId,
  spanId:   spanId,
  payload:  { method: "POST", url: "/api/checkout", latency_ms: 240 },
});

// Metric
watcher.metric("app.startup_time_ms", startupMs, {
  payload: { cold_start: true },
});

// AI (for apps with AI features)
watcher.ai("info", "llm.response.received", {
  payload: {
    kind:       "user_interaction",
    feature:    "chat_assistant",
    latency_ms: 820,
  },
});
```

### Identify user

Sets `userId` on all subsequent events without requiring it per-call:

```typescript
watcher.identify("user_abc123", {
  email:    "user@example.com",  // never sent to the gateway — stored in memory only for context
  plan:     "pro",
});
```

### Manual flush

```typescript
await watcher.flush();  // force send all queued events immediately
```

Call before app background or logout if you want events delivered before the app suspends.

### Shutdown

```typescript
watcher.shutdown();  // flush and stop all background timers
```

---

## Automatic Device Context

Every event automatically includes device metadata in the `payload` alongside developer-supplied fields:

```json
{
  "payload": {
    "device_platform":   "ios",
    "device_os_version": "17.4",
    "device_model":      "iPhone 15 Pro",
    "app_version":       "2.1.0",
    "app_build":         "104",
    "is_emulator":       false,
    "your_custom_field": "value"
  }
}
```

Device info comes from `react-native-device-info`. If the package is not installed, device fields are omitted gracefully — no crash.

---

## Offline Queue

When the device has no network connectivity:
1. Events are serialized to JSON and appended to an `AsyncStorage` list under the key `@watcher/queue`
2. The queue is bounded to 500 events (oldest events are dropped when full)
3. When `AppState` transitions to `active` (foreground), the SDK checks connectivity and flushes the offline queue before the live queue

```typescript
// AsyncStorage key
@watcher/queue   → JSON array of serialized EventPayload objects
```

The offline queue is separate from the in-memory live queue. Live queue flushes on batch size or timer; offline queue flushes on foreground resume.

---

## App State Handling

```typescript
// SDK internally subscribes to AppState
AppState.addEventListener("change", (nextState) => {
  if (nextState === "active") {
    this.flushOfflineQueue();  // drain offline queue first
    this.flush();              // then flush live queue
  }
  if (nextState === "background") {
    this.flush();              // best-effort flush before backgrounding
  }
});
```

---

## Example App

The existing `examples/react-native/` app (`App.tsx` and `lib/`) uses the React Native SDK. It demonstrates:
- Login → audit event
- Screen navigation → log event
- API call with tracing → trace event  
- Offline simulation → queue inspection

The example currently uses a placeholder SDK. Once `sdk/react-native/` is built, update the example to use the real package.
