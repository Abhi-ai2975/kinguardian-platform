# Go SDK — API Reference

## `NewClient(opts ClientOptions) (*Client, error)`

Creates a Watcher24 client and starts the background flush goroutine. Returns an error if `APIKey` is empty.

```go
client, err := watcher.NewClient(watcher.ClientOptions{
    APIKey:      os.Getenv("WATCHER_API_KEY"),
    ServiceName: "payment-api",
    Environment: "production",
})
```

---

## Event Methods

All event methods are non-blocking — they push to an in-memory buffer and return immediately. The buffer is drained by a background goroutine.

### `Audit(message string, opts ...EventOption) error`

Records a user action or compliance event at `info` severity.

```go
client.Audit("user.login",
    watcher.WithUserID("u_abc123"),
    watcher.WithSessionID("sess_xyz"),
    watcher.WithPayload(map[string]any{
        "method": "email",
        "ip":     "203.0.113.1",
    }),
)
```

### `Log(severity, message string, opts ...EventOption) error`

Records an application log. `severity` must be one of the `SeverityXxx` constants.

```go
client.Log(watcher.SeverityError, "database connection lost",
    watcher.WithPayload(map[string]any{
        "host": "db.internal",
        "err":  err.Error(),
    }),
)
```

### `Trace(message string, opts ...EventOption) error`

Records a distributed trace span at `info` severity. Use `WithTraceID`, `WithSpanID`, and `WithParentSpanID` to build trace trees across services.

```go
client.Trace("http.request",
    watcher.WithTraceID("trace-abc123"),
    watcher.WithSpanID("span-root"),
    watcher.WithPayload(map[string]any{
        "method": "POST",
        "path":   "/api/orders",
        "status": 200,
    }),
)

// Child span
client.Trace("db.query",
    watcher.WithTraceID("trace-abc123"),
    watcher.WithSpanID("span-db"),
    watcher.WithParentSpanID("span-root"),
    watcher.WithPayload(map[string]any{"latency_ms": 12}),
)
```

### `Metric(message string, opts ...EventOption) error`

Records a metric data point at `info` severity. Put numeric values in the payload.

```go
client.Metric("api.request_duration",
    watcher.WithPayload(map[string]any{
        "p50_ms": 45,
        "p95_ms": 120,
        "p99_ms": 340,
        "count":  1024,
    }),
)
```

### `AI(severity, message string, opts ...EventOption) error`

Records an AI agent event. `severity` must be one of the `SeverityXxx` constants. Always attach a payload with a `"kind"` field.

```go
client.AI(watcher.SeverityInfo, "llm.call.completed",
    watcher.WithTraceID(traceID),
    watcher.WithSpanID(spanID),
    watcher.WithPayload(map[string]any{
        "kind": "llm_call", "provider": "openai", "model": "gpt-4o",
        "total_tokens": 1240, "cost_usd": 0.0037, "latency_ms": 820,
    }),
)

client.AI(watcher.SeverityInfo, "tool.call.completed",
    watcher.WithTraceID(traceID),
    watcher.WithPayload(map[string]any{
        "kind": "tool_call", "tool_name": "web_search", "latency_ms": 340, "success": true,
    }),
)
```

`EventTypeAI` (`"ai"`) is also available for use with the generic `Event` method.

---

### `Event(eventType, severity, message string, opts ...EventOption) error`

Records a generic event when the typed helpers don't fit. Both `eventType` and `severity` are validated against the known constants.

```go
client.Event(watcher.EventTypeSecurity, watcher.SeverityWarn,
    "suspicious login attempt",
    watcher.WithPayload(map[string]any{
        "ip":      "198.51.100.1",
        "attempts": 5,
    }),
)
```

---

## EventOption functions

| Function | Description |
|----------|-------------|
| `WithUserID(id string)` | Attach a user identifier |
| `WithSessionID(id string)` | Attach a session identifier |
| `WithTraceID(id string)` | Distributed trace ID |
| `WithSpanID(id string)` | Span ID within a trace |
| `WithParentSpanID(id string)` | Parent span ID for trace trees |
| `WithPayload(p map[string]any)` | Arbitrary structured data |

---

## Constants

### Event types

```go
watcher.EventTypeAudit          // "audit"
watcher.EventTypeLog            // "log"
watcher.EventTypeTrace          // "trace"
watcher.EventTypeMetric         // "metric"
watcher.EventTypeEvent          // "event"
watcher.EventTypeSecurity       // "security"
watcher.EventTypeAI             // "ai"
watcher.EventTypeSystem         // "system"
watcher.EventTypeInfrastructure // "infrastructure"
```

### Severities

```go
watcher.SeverityDebug    // "debug"
watcher.SeverityInfo     // "info"
watcher.SeverityWarn     // "warn"
watcher.SeverityError    // "error"
watcher.SeverityCritical // "critical"
```

---

## Lifecycle

### `Flush() error`

Immediately drains the buffer and sends all pending events. Blocks until the send completes. Use at the end of a serverless function handler or before a process checkpoint.

```go
if err := client.Flush(); err != nil {
    log.Printf("flush: %v", err)
}
```

### `Shutdown() error`

Performs a final flush and stops the background goroutine. Always call (or defer) before process exit.

```go
defer client.Shutdown()
```

---

## Error handling

All event methods return an error only for **input validation failures** (empty message, unknown event type, unknown severity). They never block or return transport errors — failed sends are logged to stderr and the batch is dropped.

`Flush()` and `Shutdown()` return transport errors because those are explicit synchronous operations where the caller expects acknowledgement.
