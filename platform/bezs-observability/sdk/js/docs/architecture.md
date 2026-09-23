# Watcher SDK (JavaScript) — Architecture

## Clean Architecture

```
Domain (EventInput — pure data, no I/O)
  ↑
Ports (Transport interface — no implementation)
  ↑
Use Cases (CaptureEvent, FlushBuffer — business logic)
  ↑
Core (Buffer, Flusher, Client — wires use cases together)
  ↑
Adapters (NodeTransport, BrowserTransport — platform HTTP)
  ↑
Integrations (React provider, Next.js middleware)
```

All layers live in `@watcher/core`. Adapters live in `@watcher/node`
and `@watcher/browser`. Integrations live in `@watcher/react` and `@watcher/nextjs`.

---

## Layer Breakdown

### 1. Domain (`@watcher/core/src/domain/`)

`EventInput` — everything the application knows at capture time.
Immutable plain object. No classes, no methods. The gateway adds org context.

---

### 2. Ports (`@watcher/core/src/ports/`)

`Transport` — interface for delivering a batch of events.
Use cases depend on this, not on `NodeTransport` or `BrowserTransport`.
Keeps core testable without any real HTTP.

---

### 3. Use Cases (`@watcher/core/src/usecases/`)

| File | Class | What It Does |
|------|-------|-------------|
| `capture-event.ts` | `CaptureEventUseCase` | Validates, builds `EventInput`, pushes to buffer |
| `flush-buffer.ts` | `FlushBufferUseCase` | Drains buffer, calls `transport.send()` |

---

### 4. Buffer (`@watcher/core/src/buffer.ts`)

Plain array with a max-size cap. JavaScript is single-threaded — no lock needed.
Oldest events are dropped when the cap is exceeded.

---

### 5. Flusher (`@watcher/core/src/flusher.ts`)

`setInterval`-based flusher (500ms default). Also flushes when the buffer
reaches `flushAt` events. Calls `clearInterval` on `stop()`.

---

### 6. Client (`@watcher/core/src/client.ts`)

Public façade. Wires all layers. Application code only ever touches this class.

---

### 7. Adapters

| Package | Class | Transport |
|---------|-------|-----------|
| `@watcher/node` | `NodeTransport` | `node:https` — stdlib, no extra deps |
| `@watcher/browser` | `BrowserTransport` | `fetch` for batches, `navigator.sendBeacon` on `visibilitychange` |

---

### 8. Integrations

| Package | What It Does |
|---------|-------------|
| `@watcher/react` | `WatcherProvider` wraps app in context; hooks expose client methods |
| `@watcher/nextjs` | Edge middleware auto-traces API requests; server helper for RSC |
