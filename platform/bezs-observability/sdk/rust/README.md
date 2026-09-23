# watcher-sdk — Watcher24 Rust SDK

Official Rust client for [Watcher24](https://watcher24.io). Ingest logs, audit events, traces, and metrics from any Rust service.

## Installation

```toml
[dependencies]
watcher-sdk = "0.1"
serde_json   = "1"   # for json! macro in payloads
```

## Quick start

```rust
use watcher_sdk::{Client, Severity};
use serde_json::json;

fn main() -> watcher_sdk::Result<()> {
    let client = Client::builder(std::env::var("WATCHER_API_KEY").unwrap())
        .app_id(std::env::var("WATCHER_APP_ID").unwrap_or_default())
        .service_name("my-service")
        .environment("production")
        .build()?;

    client.audit("user.login")
        .user_id("u_123")
        .payload(json!({ "method": "email" }))
        .send()?;

    client.log(Severity::Error, "payment failed")
        .payload(json!({ "order_id": "o_001", "reason": "card_declined" }))
        .send()?;

    client.trace("db.query")
        .trace_id("trace-abc")
        .span_id("span-db")
        .parent_span_id("span-root")
        .send()?;

    client.metric("api.latency")
        .payload(json!({ "p99_ms": 340 }))
        .send()?;

    client.shutdown();
    Ok(())
}
```

## Event methods

| Method | Event type | Default severity |
|--------|-----------|-----------------|
| `audit(message)` | `audit` | `Info` |
| `log(severity, message)` | `log` | caller-specified |
| `trace(message)` | `trace` | `Info` |
| `metric(message)` | `metric` | `Info` |
| `event(type, severity, message)` | caller-specified | caller-specified |

## Builder methods on EventBuilder

```rust
.user_id("u_123")
.session_id("sess_xyz")
.trace_id("trace-abc")
.span_id("span-1")
.parent_span_id("span-root")
.payload(json!({ "key": "value" }))
.send()?   // must call send() to record the event
```

## Configuration

```rust
Client::builder("wtch_...")
    .app_id("your-app-id")            // optional — Settings → Apps
    .service_name("payment-api")      // optional
    .environment("production")        // default: "production"
    .gateway_url("https://...")       // default: https://ingest.watcher24.io
    .flush_interval(Duration::from_millis(500))  // default: 500ms
    .flush_at(100)                    // default: 100
    .max_buffer(10_000)               // default: 10,000
    .build()?
```

## Lifecycle

```rust
// Force-send all buffered events (e.g. end of a request handler)
client.flush()?;

// Flush + stop background thread — always call before process exit
client.shutdown();
```

## Docs

- [API reference](docs/api.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
