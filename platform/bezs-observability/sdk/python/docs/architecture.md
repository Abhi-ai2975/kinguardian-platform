# Watcher SDK (Python) — Architecture

## Clean Architecture

```
Domain (EventInput — pure data, no I/O)
  ↑
Ports (Transport interface — no implementation)
  ↑
Use Cases (CaptureEvent, FlushBuffer — business logic)
  ↑
Adapters (HttpTransport — real HTTP to gateway)
  ↑
Client (public façade — what developers import)
  ↑
Integrations (FastAPI — auto-instrumentation on top of Client)
```

---

## Layer Breakdown

### 1. Domain (`domain/`)

| File | Purpose |
|------|---------|
| `event.py` | `EventInput` — what the application passes to the SDK |

`EventInput` is intentionally minimal — the gateway adds org context,
enrichment metadata, and ingestion timestamp. The SDK only needs what
the application can know: message, event type, severity, payload.

---

### 2. Ports (`ports/`)

| File | Interface | Purpose |
|------|-----------|---------|
| `transport.py` | `Transport` | Send a batch of events to the gateway |

The use cases depend on `Transport`, not `HttpTransport`.
This means unit tests can inject a `FakeTransport` without making HTTP calls.

---

### 3. Use Cases (`usecases/`)

| File | Class | What It Does |
|------|-------|-------------|
| `capture_event.py` | `CaptureEventUseCase` | Validates input, builds Event, puts it in the buffer |
| `flush_buffer.py` | `FlushBufferUseCase` | Drains the buffer and sends to gateway via Transport |

---

### 4. Adapters (`adapters/`)

| File | Implements | Technology |
|------|-----------|-----------|
| `http_transport.py` | `Transport` | `urllib.request` — stdlib only, no extra deps |

Uses Python's standard library `urllib.request` to avoid adding `httpx`
or `requests` as dependencies. The SDK should be lightweight.

---

### 5. Buffer (`buffer.py`)

Thread-safe in-memory queue (`collections.deque` + `threading.Lock`).
Holds events between captures and flushes. Max size: 10,000 events
(oldest dropped if exceeded to prevent unbounded memory growth).

---

### 6. Flusher (`flusher.py`)

Background daemon thread that flushes the buffer:
- Every 500ms (time-based)
- OR when buffer size reaches `flush_at` threshold (size-based)

Both triggers ensure events are delivered promptly without the application
needing to call `flush()` manually.

---

### 7. Client (`client.py`)

The public façade. Wires all layers together and exposes the simple API.
Application developers only ever interact with this class.
