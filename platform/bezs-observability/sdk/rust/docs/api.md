# Rust SDK — API Reference

## `Client::builder(api_key) -> ClientConfigBuilder`

Returns a builder. Call `.build()` to get a `Client`.

```rust
let client = Client::builder(std::env::var("WATCHER_API_KEY")?)
    .app_id(std::env::var("WATCHER_APP_ID").unwrap_or_default())
    .service_name("payment-api")
    .environment("production")
    .build()?;
```

---

## Event methods

All event methods return an `EventBuilder`. You **must** call `.send()` on it — the `#[must_use]` attribute produces a compiler warning if you forget.

### `audit(message) -> EventBuilder`

Records a user action or compliance event at `Info` severity.

```rust
client.audit("user.login")
    .user_id("u_abc123")
    .session_id("sess_xyz")
    .payload(json!({
        "method": "email",
        "ip": "203.0.113.1",
    }))
    .send()?;
```

### `log(severity, message) -> EventBuilder`

Records an application log. Pass a `Severity` variant.

```rust
client.log(Severity::Error, "database connection lost")
    .payload(json!({ "host": "db.internal", "error": err.to_string() }))
    .send()?;
```

### `trace(message) -> EventBuilder`

Records a distributed trace span at `Info` severity.

```rust
client.trace("http.request")
    .trace_id(&trace_id)
    .span_id("span-root")
    .payload(json!({ "method": "POST", "path": "/api/orders" }))
    .send()?;

// Child span
client.trace("db.insert")
    .trace_id(&trace_id)
    .span_id("span-db")
    .parent_span_id("span-root")
    .payload(json!({ "table": "orders", "latency_ms": 12 }))
    .send()?;
```

### `metric(message) -> EventBuilder`

Records a metric data point at `Info` severity.

```rust
client.metric("api.request_duration")
    .payload(json!({
        "p50_ms": 45,
        "p95_ms": 120,
        "p99_ms": 340,
        "count":  1024,
    }))
    .send()?;
```

### `ai(severity, message) -> EventBuilder`

Records an AI agent event. Always attach a payload with a `"kind"` field.

```rust
client.ai(Severity::Info, "llm.call.completed")
    .trace_id(&trace_id)
    .span_id("llm-001")
    .payload(json!({
        "kind": "llm_call", "provider": "openai", "model": "gpt-4o",
        "total_tokens": 1240, "cost_usd": 0.0037, "latency_ms": 820,
    }))
    .send()?;

client.ai(Severity::Info, "tool.call.completed")
    .trace_id(&trace_id)
    .payload(json!({ "kind": "tool_call", "tool_name": "web_search", "latency_ms": 340, "success": true }))
    .send()?;
```

`EventType::Ai` is also available for use with the generic `event()` method.

---

### `event(event_type, severity, message) -> EventBuilder`

Records a generic event when typed helpers don't fit.

```rust
client.event(EventType::Security, Severity::Warn, "suspicious login")
    .payload(json!({ "ip": "198.51.100.1", "attempts": 5 }))
    .send()?;
```

---

## EventBuilder methods

| Method | Description |
|--------|-------------|
| `.user_id(id)` | User identifier |
| `.session_id(id)` | Session identifier |
| `.trace_id(id)` | Distributed trace ID |
| `.span_id(id)` | Span ID within a trace |
| `.parent_span_id(id)` | Parent span ID for trace trees |
| `.payload(value)` | `serde_json::Value` — arbitrary structured data |
| `.send() -> Result<()>` | **Required** — pushes the event to the buffer |

All field setters accept any type that implements `Into<String>`.

---

## Enums

### `Severity`

```rust
Severity::Debug
Severity::Info
Severity::Warn
Severity::Error
Severity::Critical
```

### `EventType`

```rust
EventType::Audit
EventType::Log
EventType::Trace
EventType::Metric
EventType::Event
EventType::Security
EventType::Ai
EventType::System
EventType::Infrastructure
```

---

## Lifecycle

### `flush() -> Result<()>`

Drains the buffer and sends all pending events immediately. Blocks until complete. Use at the end of a short-lived handler.

```rust
client.flush()?;
```

### `shutdown(self)`

Performs a final flush, signals the background thread to stop, and joins it. Call (or defer via `Drop`) before process exit.

```rust
client.shutdown();
```

---

## Error handling

`send()` returns `Ok(())` for all buffered pushes — transport errors never propagate to the caller (they are logged to stderr). Only input validation errors (`EmptyMessage`) are returned from `send()`.

`flush()` and `shutdown()` surface transport errors because those are explicit synchronous operations where the caller expects acknowledgement.

```rust
match client.flush() {
    Ok(()) => {}
    Err(watcher_sdk::Error::Transport(msg)) => eprintln!("flush failed: {msg}"),
    Err(e) => eprintln!("unexpected: {e}"),
}
```
