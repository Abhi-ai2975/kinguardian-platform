# Public Read API — Watcher24

## Purpose

The gateway today is write-only — it accepts events via `POST /v1/events` and publishes them to Redis Streams. There is no way for a developer to programmatically query their own events using an API key.

Developers need this to:
- Build custom dashboards in their own tooling (Grafana, Retool, internal tools)
- Run automated checks against their observability data from CI pipelines
- Export events for offline analysis or compliance archives
- Trigger downstream workflows based on event patterns without polling the console

The Public Read API adds `GET` endpoints to the gateway so developers can query events, traces, and aggregated metrics using their existing API key — no console access required.

---

## Authentication

Uses the same API key header as event ingestion:
```
Authorization: Bearer wtch_...
```

Secret API keys (`wtch_` prefix, server-side) support both read and write by default. Public tokens (`wpub_` prefix, browser-side) are **write-only** — they never get read access.

### Read scope on API keys

Add a `scope` field to the `APIKey` domain type and the IAM `apikey` table:

| Scope | What it allows |
|-------|---------------|
| `write` | Ingest events only (current default for all keys) |
| `read` | Query events only |
| `read_write` | Both — for server-side keys where the developer wants both |

Existing keys default to `write` (no breaking change). New keys created after this feature is shipped can be `read`, `write`, or `read_write`. The scope is shown in the API keys settings page.

---

## Rate Limiting

Read requests are rate-limited separately from write requests. Read queries can be expensive (full ClickHouse scans) so limits are lower:

| Plan | Read requests / minute |
|------|----------------------|
| Free | 10 |
| Pro | 60 |
| Enterprise | 300 |

Rate limiting uses the same Redis `INCR + EXPIRE` pattern as the current public token minute rate limiter, with a separate key namespace: `rate:read:{keyID}:{unix_minute}`.

---

## Endpoints

### Events

#### `GET /v1/events`
List events for the org, paginated and filterable.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `event_type` | string | all | Filter by event type (`log`, `audit`, `trace`, `metric`, `ai`) |
| `severity` | string | all | Filter by severity (`debug`, `info`, `warn`, `error`, `critical`) |
| `from` | ISO 8601 | 1h ago | Start of time range |
| `to` | ISO 8601 | now | End of time range |
| `application_id` | string | — | Filter to a specific application |
| `environment` | string | — | Filter by environment |
| `search` | string | — | Full-text search on `message` |
| `limit` | int | 50 | Results per page (max 200) |
| `offset` | int | 0 | Pagination offset |

**Response:**
```json
{
  "events": [
    {
      "id":              null,
      "timestamp":       "2026-05-31T14:03:00.000Z",
      "event_type":      "log",
      "severity":        "error",
      "message":         "database connection failed",
      "trace_id":        "abc123",
      "span_id":         "span456",
      "user_id":         "user_789",
      "application_id":  "app_prod",
      "environment":     "production",
      "service_name":    "api",
      "payload":         { "error": "connection refused", "host": "db.internal" }
    }
  ],
  "total":  null,
  "limit":  50,
  "offset": 0,
  "has_more": true
}
```

`total` is `null` — ClickHouse COUNT on every page is expensive. Use `has_more` (true when `len(events) == limit`) for pagination.

#### `GET /v1/events/count`
Returns the event count for a time range without fetching rows — cheap `COUNT()` query.

```json
{
  "count":      14820,
  "from":       "2026-05-31T00:00:00Z",
  "to":         "2026-05-31T23:59:59Z",
  "event_type": "log"
}
```

---

### Traces

#### `GET /v1/traces/:traceId`
Fetch all spans for a trace, ordered by timestamp.

```json
{
  "trace_id": "abc123",
  "spans": [
    {
      "span_id":        "span001",
      "parent_span_id": null,
      "timestamp":      "2026-05-31T14:03:00.000Z",
      "event_type":     "trace",
      "message":        "http.request",
      "payload":        { "method": "GET", "path": "/api/users", "status": 200, "latency_ms": 42 }
    }
  ]
}
```

---

### Metrics and Aggregates

#### `GET /v1/metrics/summary`
Returns aggregated stats for the org over a time range.

**Query params:** `from`, `to`, `event_type`, `application_id`

```json
{
  "from":         "2026-05-31T00:00:00Z",
  "to":           "2026-05-31T23:59:59Z",
  "total_events": 48200,
  "error_count":  142,
  "error_rate":   0.0029,
  "unique_users": 831,
  "by_severity": {
    "debug": 12000,
    "info":  33000,
    "warn":  3058,
    "error": 132,
    "critical": 10
  }
}
```

#### `GET /v1/metrics/timeseries`
Returns event counts bucketed by time interval.

**Query params:** `from`, `to`, `interval` (`1m`, `5m`, `1h`, `1d`), `event_type`, `severity`

```json
{
  "interval": "1h",
  "buckets": [
    { "timestamp": "2026-05-31T00:00:00Z", "count": 1820, "error_count": 12 },
    { "timestamp": "2026-05-31T01:00:00Z", "count": 2140, "error_count": 8 }
  ]
}
```

---

## Error Responses

All errors follow the standard shape already used by the gateway:

```json
{
  "error": "rate limit exceeded — upgrade your plan for higher read limits",
  "code":  "rate_limit_exceeded"
}
```

| HTTP Status | Code | When |
|-------------|------|------|
| 401 | `unauthorized` | Missing or invalid API key |
| 403 | `forbidden` | Key has `write` scope only |
| 429 | `rate_limit_exceeded` | Read rate limit hit |
| 400 | `invalid_param` | Bad query param (invalid date, unknown event_type) |
| 500 | `internal_error` | ClickHouse query failed |

---

## SDK Read Methods

Once the gateway endpoints exist, add read methods to all SDKs so developers don't need to construct HTTP calls manually:

### JavaScript/TypeScript
```typescript
const events = await watcher.query({
  eventType:   "log",
  severity:    "error",
  from:        new Date(Date.now() - 3600_000),
  limit:       50,
});

const summary = await watcher.metrics.summary({ from, to });
const series  = await watcher.metrics.timeseries({ from, to, interval: "1h" });
```

### Python
```python
events = watcher.query(event_type="log", severity="error", from_=from_dt, limit=50)
summary = watcher.metrics.summary(from_=from_dt, to=to_dt)
```

### Go
```go
events, err := client.Query(ctx, watcher.QueryOptions{
    EventType: "log",
    Severity:  "error",
    From:      time.Now().Add(-time.Hour),
    Limit:     50,
})
```

---

## What the Public API Does NOT Include

- **Writing events** — that stays on `POST /v1/events`. Read-scoped keys cannot ingest.
- **Admin operations** — no org management, no user management, no billing.
- **Real-time streaming** — use the WebSocket endpoint (`/ws`) from `realtime-go` for live events. The read API is for historical queries only.
- **Cross-org queries** — each API key is scoped to one org. There is no super-admin read API.

---

## Architecture — Where Read Endpoints Live

The read endpoints are added to `apps/gateway-go`, not as a new service. Reasons:
- API key auth middleware is already there
- Rate limiting infrastructure is already there
- ClickHouse client is already there (`LimitCheckerAdapter` — the read adapter is an extension of this)
- Adding a new service just to proxy ClickHouse reads adds latency and operational overhead

The gateway gains a new port: `EventQueryRepository` (read-only ClickHouse adapter). This keeps the clean architecture: transport layer calls use cases, use cases call the port, adapter implements the port with ClickHouse queries.

```
gateway-go
  internal/
    ports/
      event_query.go        — EventQueryRepository interface (new)
    usecases/
      query_events.go       — QueryEventsUseCase (new)
      query_trace.go        — QueryTraceUseCase (new)
      query_metrics.go      — QueryMetricsUseCase (new)
    adapters/
      clickhouse/
        event_query_adapter.go  — ClickHouse SELECT queries (new)
    transport/
      handlers/
        query.go            — GET handlers (new)
```
