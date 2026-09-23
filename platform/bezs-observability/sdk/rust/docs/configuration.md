# Rust SDK — Configuration

All configuration is set via `Client::builder(api_key)`.

## Options

| Method | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `Client::builder(api_key)` | `&str` / `String` | **Yes** | — | Secret key (`wtch_` prefix) from Settings → API Keys |
| `.app_id(id)` | `&str` | No | None | Links events to a registered application. Get the ID from Settings → Apps. |
| `.service_name(name)` | `&str` | No | None | Component label (e.g. `"payment-api"`). Sent as `X-Service-Name`. |
| `.environment(env)` | `&str` | No | `"production"` | Deployment stage: `"production"`, `"staging"`, `"development"`. |
| `.gateway_url(url)` | `&str` | No | `https://ingest.watcher24.io` | Override for self-hosted deployments. |
| `.flush_interval(d)` | `Duration` | No | `500ms` | How often the background thread sends buffered events. |
| `.flush_at(n)` | `usize` | No | `100` | Buffer size that triggers an immediate flush. |
| `.max_buffer(n)` | `usize` | No | `10_000` | Maximum events held in memory. Oldest dropped when full. |

## Environment variables (recommended pattern)

```rust
let client = Client::builder(std::env::var("WATCHER_API_KEY").expect("WATCHER_API_KEY required"))
    .app_id(std::env::var("WATCHER_APP_ID").unwrap_or_default())
    .service_name(std::env::var("WATCHER_SERVICE_NAME").unwrap_or_default())
    .environment(std::env::var("APP_ENV").unwrap_or_else(|_| "production".to_owned()))
    .build()?;
```

```bash
WATCHER_API_KEY=wtch_...          # required
WATCHER_APP_ID=your_app_id_here   # optional — from Settings → Apps
WATCHER_SERVICE_NAME=my-service   # optional
APP_ENV=production                 # optional

# Only for local dev or self-hosted:
# WATCHER_GATEWAY_URL=http://localhost:8080
```

## Tuning flush behaviour

- **Default** (`flush_interval=500ms`, `flush_at=100`): works well for most services.
- **High-volume** (> 1,000 events/sec): lower `flush_at` to 50, `flush_interval` to 200ms.
- **Serverless / Lambda-like**: set `flush_interval` to a large value and call `client.flush()` at the end of each request — the background thread tick won't fire fast enough.
- **Max buffer**: if you see `watcher: flush error … events dropped` in stderr, increase `max_buffer` or decrease `flush_interval`.
