# Rust SDK — Overview

## What it does

The Watcher24 Rust SDK is a lightweight client library for sending telemetry events to the Watcher24 ingestion gateway from any Rust service. It supports the same four event types as all other SDKs:

| Type | Use case |
|------|----------|
| `audit` | User actions, permission changes, compliance trails |
| `log` | Application logs with structured payload |
| `trace` | Distributed trace spans with parent-child relationships |
| `metric` | Numeric measurements (latency, throughput, error rates) |

## Why it exists

Rust services need a first-class, idiomatic SDK rather than raw HTTP calls. The Rust SDK provides:

- **Non-blocking** — events are buffered in-memory and sent by a background thread; no latency added to the hot path
- **Thread-safe** — all public methods are safe to call from multiple threads (`Send + Sync`)
- **No async runtime** — uses `std::thread` and blocking `ureq`; works in both sync and async codebases
- **Idiomatic builder API** — `EventBuilder` with `#[must_use]` prevents accidental silent drops
- **Minimal dependencies** — only `serde`, `serde_json`, and `ureq`
- **Graceful shutdown** — `shutdown()` flushes remaining events before the thread exits

## Where it fits

```
Your Rust service
    └── watcher_sdk::Client
            └── (background thread)
                    └── POST /v1/events
                            └── gateway-go → Redis → ClickHouse
```

## Versioning

Current version: **0.1.0** — MVP feature set.
Crate name: `watcher-sdk`
