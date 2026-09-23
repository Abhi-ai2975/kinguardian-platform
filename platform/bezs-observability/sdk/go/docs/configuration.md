# Go SDK — Configuration

All configuration is passed to `NewClient` via `ClientOptions`.

## Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `APIKey` | `string` | **Yes** | — | Watcher24 API key. Use a secret key (`wtch_` prefix) for server-side Go apps. |
| `AppID` | `string` | No | `""` | Links events to a registered application in the dashboard. |
| `ServiceName` | `string` | No | `""` | Human-readable component label (e.g. `"payment-api"`). Sent as `X-Service-Name`. |
| `Environment` | `string` | No | `"production"` | Deployment stage label. Common values: `"production"`, `"staging"`, `"development"`. |
| `GatewayURL` | `string` | No | `"https://ingest.watcher24.io"` | Base URL of the ingestion gateway. Override for self-hosted deployments. |
| `FlushInterval` | `time.Duration` | No | `500ms` | How often the background goroutine sends buffered events. |
| `FlushAt` | `int` | No | `100` | Buffer size that triggers an immediate flush before the next timer tick. |
| `MaxBuffer` | `int` | No | `10,000` | Maximum events held in memory. Oldest event dropped when full. |

## Environment variables (recommended)

Store sensitive values in environment variables rather than hardcoding:

```bash
WATCHER_API_KEY=wtch_...
WATCHER_APP_ID=abc123
WATCHER_GATEWAY_URL=https://ingest.watcher24.io  # optional, default shown
APP_ENV=production
```

```go
client, err := watcher.NewClient(watcher.ClientOptions{
    APIKey:      os.Getenv("WATCHER_API_KEY"),
    AppID:       os.Getenv("WATCHER_APP_ID"),
    Environment: os.Getenv("APP_ENV"),
})
```

## Tuning FlushInterval and FlushAt

These two settings control batching behaviour:

- **Low-volume services** (< 10 events/sec): defaults work well. Most events are sent on the 500ms tick.
- **High-volume services** (> 1,000 events/sec): lower `FlushAt` to 50 and `FlushInterval` to 200ms to reduce latency.
- **Serverless / Lambda**: set `FlushInterval` high (e.g. 60s) and call `client.Flush()` explicitly at the end of each invocation. This minimises goroutine overhead.

## MaxBuffer and backpressure

The SDK never blocks the caller. When the buffer is full, **the oldest event is dropped silently**. This is intentional — telemetry must not affect application availability.

If you see events being dropped (check stderr for `watcher: flush error`), either:
- Increase `MaxBuffer`
- Decrease `FlushAt` / `FlushInterval` to send faster
- Check that the gateway is reachable and healthy
