# Rust SDK — Architecture

## Clean Architecture layers

```
Domain (event types, Severity, EventType, WireEvent)
  ↑
Port (Transport trait)
  ↑
Adapters (HttpTransport, Buffer, Flusher)
  ↑
Public API (Client, EventBuilder, ClientConfig)
```

## File responsibilities

| File | Layer | Responsibility |
|------|-------|---------------|
| `src/error.rs` | — | `Error` enum, `Result<T>` alias |
| `src/event.rs` | Domain | `WireEvent`, `Severity`, `EventType`, `EventBuilder` |
| `src/transport.rs` | Port + Adapter | `Transport` trait + `HttpTransport` (ureq, retry) |
| `src/buffer.rs` | Adapter | `Buffer` — `Arc<Mutex<Vec<WireEvent>>>` with max-size eviction |
| `src/flusher.rs` | Adapter | `Flusher` — background thread, `mpsc` channel signalling |
| `src/config.rs` | — | `ClientConfig`, `ClientConfigBuilder`, defaults |
| `src/client.rs` | Public API | `Client` — composes all layers, typed event methods |
| `src/lib.rs` | — | Re-exports public API, integration tests |

## Concurrency model

```
Application threads   →   client.audit("…").send()
                                  ↓
                           client.push(WireEvent)
                                  ↓
                           buffer.push()   [Mutex lock, O(1)]
                                  ↓
                           flusher.notify()  [try_send on SyncSender]
                                  ↓
              [background thread]
              recv_timeout(flush_interval)  ← timer tick
              or recv Ok(FlushSignal::Flush) ← threshold trigger
                                  ↓
                           buffer.drain()   [Mutex lock, swap]
                                  ↓
                      HttpTransport::send()  [ureq blocking POST]
```

Key properties:
- **Application threads never block on I/O** — they only acquire a Mutex for a Vec push
- **Single flusher thread** — no concurrent sends; ordered delivery
- **Bounded mpsc channel (capacity 1)** — a second trigger while one is queued is a no-op via `try_send`; prevents a send storm when the buffer fills rapidly

## Retry strategy

`HttpTransport` retries with exponential backoff for transient failures:

| Attempt | Delay before |
|---------|-------------|
| 1st | immediate |
| 2nd | 100ms |
| 3rd | 200ms |
| 4th | 400ms |

**4xx responses are never retried** — a 401 or 403 will not change on retry. The batch is dropped immediately and the error is returned.

## `#[must_use]` on EventBuilder

`EventBuilder` is annotated `#[must_use = "call .send() to record this event"]`. If a caller creates a builder but never calls `.send()`, the Rust compiler emits a warning at compile time — preventing silent event drops without a runtime cost.

## Dependencies

| Crate | Purpose |
|-------|---------|
| `serde` + `serde_json` | Serialise `WireEvent` to JSON; `json!` macro in user code |
| `ureq` | Blocking HTTP client for the gateway POST |
