# Go SDK — Overview

## What it does

The Watcher24 Go SDK is a lightweight, zero-dependency client library for sending telemetry events to the Watcher24 ingestion gateway from any Go service.

It supports four event types out of the box:

| Type | Use case |
|------|----------|
| `audit` | User actions, permission changes, compliance trails |
| `log` | Application logs with structured payload |
| `trace` | Distributed trace spans with parent-child relationships |
| `metric` | Numeric measurements (latency, throughput, error rates) |

## Why it exists

Go services need a first-class, idiomatic SDK rather than raw HTTP calls. The Go SDK provides:

- **Non-blocking**: events are buffered in-memory and sent by a background goroutine — no latency added to your hot path
- **Thread-safe**: all public methods are safe to call from multiple goroutines
- **Zero dependencies**: only stdlib (`net/http`, `encoding/json`, `sync`) — no third-party packages in the SDK itself
- **Graceful shutdown**: `Shutdown()` flushes remaining events before the goroutine exits

## Where it fits

```
Your Go service
    └── watcher.Client
            └── (background goroutine)
                    └── POST /v1/events
                            └── gateway-go
                                    └── Redis Stream → ClickHouse
```

The SDK buffers events locally and sends them in batches over HTTP. The gateway validates the API key, enriches events with GeoIP data, enforces rate limits, and publishes to the analytics pipeline.

## Versioning

Current version: **0.1.0** — MVP feature set.
Module path: `github.com/watcher24/go-sdk`
