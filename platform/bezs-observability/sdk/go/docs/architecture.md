# Go SDK — Architecture

## Clean Architecture layers

The SDK follows the same one-way dependency rule as all Watcher24 apps:

```
Domain (event types, constants)
  ↑
Port (Transport interface)
  ↑
Adapters (httpTransport, buffer, flusher)
  ↑
Public API (Client)
```

## File responsibilities

| File | Layer | Responsibility |
|------|-------|---------------|
| `event.go` | Domain | `wireEvent`, `EventFields`, `EventOption`, constants |
| `transport.go` | Port + Adapter | `Transport` interface + `httpTransport` implementation |
| `buffer.go` | Adapter | Mutex-protected in-memory queue |
| `flusher.go` | Adapter | Background goroutine, timer, threshold-based flush |
| `config.go` | — | `ClientOptions`, defaults, runtime label |
| `watcher.go` | Public API | `Client` — composes all layers, exposes typed methods |

## Concurrency model

```
Application goroutines  →  client.Audit/Log/Trace/Metric
                                 ↓
                            buf.push()   (mutex-locked, O(1))
                                 ↓
                            flusher.notify()  (non-blocking channel send)
                                 ↓
                   [background goroutine]
                   ticker or trigger channel
                                 ↓
                            buf.drain()  (mutex-locked, swaps slice)
                                 ↓
                       httpTransport.Send()  (HTTP POST + retry)
```

Key properties:
- **Application goroutines never block on I/O** — they only acquire a mutex for a slice append
- **Single flush goroutine** — no concurrent sends; keeps delivery ordered
- **Trigger channel capacity 1** — multiple rapid pushes that hit the flushAt threshold only queue one trigger, preventing a send storm

## Retry strategy

The `httpTransport` retries with exponential backoff for transient failures:

| Attempt | Delay before |
|---------|-------------|
| 1st | immediate |
| 2nd | 100ms |
| 3rd | 200ms |
| 4th | 400ms |

**4xx responses are never retried** — a 401 or 403 will not change on retry, so the batch is dropped immediately to avoid wasting time.

After all retries are exhausted, the batch is dropped and the error is logged to stderr. The SDK never panics or crashes the host application on telemetry failures.

## Zero dependencies

The SDK imports only the Go standard library:

- `bytes`, `encoding/json` — serialisation
- `fmt`, `log` — errors and diagnostics
- `net/http` — HTTP transport
- `runtime` — runtime version label
- `sync` — mutex and WaitGroup
- `time` — Duration, Ticker, Sleep
