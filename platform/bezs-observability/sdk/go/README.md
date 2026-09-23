# @watcher/go — Watcher24 Go SDK

Official Go client for [Watcher24](https://watcher24.io) — ingest logs, audit events, traces, and metrics from any Go service.

## Installation

```bash
go get github.com/watcher24/go-sdk
```

## Quick start

```go
package main

import (
    "log"
    "os"

    watcher "github.com/watcher24/go-sdk"
)

func main() {
    client, err := watcher.NewClient(watcher.ClientOptions{
        APIKey:      os.Getenv("WATCHER_API_KEY"),
        ServiceName: "my-service",
    })
    if err != nil {
        log.Fatal(err)
    }
    defer client.Shutdown()

    client.Audit("user.login", watcher.WithUserID("u_123"))

    client.Log(watcher.SeverityError, "payment failed",
        watcher.WithPayload(map[string]any{"order_id": "o_001"}),
    )

    client.Trace("db.query",
        watcher.WithTraceID("trace-abc"),
        watcher.WithSpanID("span-1"),
    )

    client.Metric("api.latency_ms",
        watcher.WithPayload(map[string]any{"p99": 340}),
    )
}
```

## Event methods

| Method | Event type | Default severity |
|--------|-----------|-----------------|
| `Audit(message, ...opts)` | `audit` | `info` |
| `Log(severity, message, ...opts)` | `log` | caller-specified |
| `Trace(message, ...opts)` | `trace` | `info` |
| `Metric(message, ...opts)` | `metric` | `info` |
| `Event(type, severity, message, ...opts)` | caller-specified | caller-specified |

## Options

```go
watcher.WithUserID("u_123")
watcher.WithSessionID("sess_xyz")
watcher.WithTraceID("trace-abc")
watcher.WithSpanID("span-1")
watcher.WithParentSpanID("span-root")
watcher.WithPayload(map[string]any{"key": "value"})
```

## Configuration

```go
watcher.NewClient(watcher.ClientOptions{
    APIKey:        "wtch_...",           // required
    AppID:         "app-id",             // optional
    ServiceName:   "payment-api",        // optional
    Environment:   "production",         // default: "production"
    GatewayURL:    "https://...",        // default: https://ingest.watcher24.io
    FlushInterval: 500 * time.Millisecond, // default: 500ms
    FlushAt:       100,                  // default: 100
    MaxBuffer:     10_000,               // default: 10,000
})
```

## Lifecycle

```go
// Force-send all buffered events (e.g. end of a serverless handler)
if err := client.Flush(); err != nil { ... }

// Flush + stop background goroutine — always call before process exit
defer client.Shutdown()
```

## Docs

- [API reference](docs/api.md)
- [Configuration](docs/configuration.md)
- [Architecture](docs/architecture.md)
