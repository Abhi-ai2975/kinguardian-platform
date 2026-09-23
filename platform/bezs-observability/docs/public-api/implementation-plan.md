# Public Read API — Implementation Plan

> Grounded in the actual codebase as of 2026-05-31.
> Implement steps in order.

---

## Codebase Baseline

| What | Where | Status |
|------|-------|--------|
| API key auth middleware | `apps/gateway-go/internal/transport/middleware/auth.go` | ✅ exists |
| Redis rate limiter (per-minute, public tokens) | `apps/gateway-go/internal/adapters/redis/ratelimiter.go` | ✅ exists — extend for reads |
| ClickHouse limit checker (COUNT queries) | `apps/gateway-go/internal/adapters/clickhouse/limitchecker.go` | ✅ exists — extend for SELECT |
| `EventType` domain type | `apps/gateway-go/internal/domain/event.go` | ✅ exists |
| Fiber HTTP server | `apps/gateway-go/main.go` | ✅ exists |
| `LimitChecker` port interface | `apps/gateway-go/internal/ports/limitchecker.go` | ✅ exists |

---

## Step 1 — Add `scope` to API Keys

### 1.1 — IAM Prisma schema

**File:** `apps/iam/prisma/schema.prisma`

Add `scope` field to the `apikey` model:
```prisma
model apikey {
  // ... existing fields
  scope  String  @default("write")   // 'write' | 'read' | 'read_write'
}
```

Run `prisma migrate dev --name add_apikey_scope` in `apps/iam/`.

### 1.2 — Gateway domain type

**File:** `apps/gateway-go/internal/domain/apikey.go`

Add `Scope` field:
```go
type APIKey struct {
    // ... existing fields
    Scope string  // "write" | "read" | "read_write"
}
```

### 1.3 — Gateway key validator adapter

**File:** `apps/gateway-go/internal/adapters/postgres/keyvalidator.go`

Add `scope` to the SELECT query and map it to `APIKey.Scope`. Default to `"write"` for existing keys via `COALESCE(scope, 'write')`.

### 1.4 — Gateway auth middleware

**File:** `apps/gateway-go/internal/transport/middleware/auth.go`

Store the resolved scope in Fiber locals:
```go
const LocalScope = "scope"
c.Locals(LocalScope, apiKey.Scope)
```

### 1.5 — IAM API keys UI

**File:** `apps/console/src/app/(dashboard)/settings/api-keys/page.tsx`

Add a scope selector (Write / Read / Read+Write) to the "Create key" form. Show current scope on existing keys. Read-only once created (users must revoke and create a new key to change scope).

---

## Step 2 — Read Rate Limiter

**Create** `apps/gateway-go/internal/adapters/redis/read_ratelimiter.go`

Same pattern as `ratelimiter.go` but with:
- Key namespace: `rate:read:{keyID}:{unix_minute}`
- Per-plan limits passed from the auth middleware (read from `APIKey.PlanLimits` or a new field)

Add `ReadLimitPerMinute` to the `APIKey` domain type, resolved from the subscription plan in the key validator adapter:
```go
// In keyvalidator.go SELECT:
CASE subscription.plan
    WHEN 'enterprise' THEN 300
    WHEN 'pro'        THEN 60
    ELSE 10           -- free
END AS read_limit_per_minute
```

---

## Step 3 — `EventQueryRepository` Port

**Create** `apps/gateway-go/internal/ports/event_query.go`:

```go
// EventQueryRepository is the read port for fetching historical events from ClickHouse.
// The gateway depends on this interface so tests can inject a fake repository without
// requiring a live ClickHouse connection.
type EventQueryRepository interface {
    // QueryEvents returns a paginated list of events matching the given filters.
    QueryEvents(ctx context.Context, q EventQuery) ([]domain.Event, error)

    // QueryTrace returns all spans for the given traceID, ordered by timestamp.
    QueryTrace(ctx context.Context, orgID, traceID string) ([]domain.Event, error)

    // MetricsSummary returns aggregated event counts for a time range.
    MetricsSummary(ctx context.Context, q MetricsQuery) (*MetricsSummary, error)

    // MetricsTimeseries returns event counts bucketed by interval.
    MetricsTimeseries(ctx context.Context, q TimeseriesQuery) ([]TimeseriesBucket, error)
}

type EventQuery struct {
    OrgID         string
    EventType     string
    Severity      string
    From          time.Time
    To            time.Time
    ApplicationID string
    Environment   string
    Search        string
    Limit         int
    Offset        int
}
```

---

## Step 4 — ClickHouse Read Adapter

**Create** `apps/gateway-go/internal/adapters/clickhouse/event_query_adapter.go`

Implements `ports.EventQueryRepository`. All queries are SELECT-only.

Key query patterns:

```go
// QueryEvents
SELECT timestamp, event_type, severity, message, trace_id, span_id,
       parent_span_id, user_id, application_id, environment, payload
FROM watcher.events
WHERE organization_id = {orgID:String}
  AND ({eventType:String} = '' OR event_type = {eventType:String})
  AND ({severity:String} = '' OR severity = {severity:String})
  AND timestamp BETWEEN {from:DateTime64} AND {to:DateTime64}
  AND ({search:String} = '' OR message ILIKE {search:String})
ORDER BY timestamp DESC
LIMIT {limit:UInt32} OFFSET {offset:UInt32}

// MetricsTimeseries
SELECT toStartOf{interval}(timestamp) AS bucket,
       COUNT() AS count,
       COUNTIf(severity IN ('error','critical')) AS error_count
FROM watcher.events
WHERE organization_id = {orgID:String}
  AND timestamp BETWEEN {from:DateTime64} AND {to:DateTime64}
GROUP BY bucket
ORDER BY bucket
```

---

## Step 5 — Use Cases

**Create** `apps/gateway-go/internal/usecases/query_events.go`:
```go
// QueryEventsUseCase handles the full lifecycle of a read request:
// validate params → check read rate limit → execute query.
type QueryEventsUseCase struct {
    repo       ports.EventQueryRepository
    readLimiter ports.ReadRateLimiter
}
```

**Create** `apps/gateway-go/internal/usecases/query_trace.go`
**Create** `apps/gateway-go/internal/usecases/query_metrics.go`

Each use case:
1. Validates input (date range not > 90 days, limit ≤ 200, valid event type)
2. Checks read rate limit
3. Calls the repository
4. Returns domain objects (not raw ClickHouse rows)

---

## Step 6 — HTTP Handlers

**Create** `apps/gateway-go/internal/transport/handlers/query.go`

```go
// GET /v1/events
func (h *QueryHandler) HandleQueryEvents(c *fiber.Ctx) error {
    scope, _ := c.Locals(middleware.LocalScope).(string)
    if scope != "read" && scope != "read_write" {
        return c.Status(403).JSON(fiber.Map{
            "error": "this API key does not have read scope",
            "code":  "forbidden",
        })
    }
    // parse query params → build EventQuery → call use case
}
```

Register routes in `apps/gateway-go/internal/transport/server.go` under the `/v1` group (same auth middleware applies):
```go
v1.Get("/events",              queryHandler.HandleQueryEvents)
v1.Get("/events/count",        queryHandler.HandleCountEvents)
v1.Get("/traces/:traceId",     queryHandler.HandleQueryTrace)
v1.Get("/metrics/summary",     queryHandler.HandleMetricsSummary)
v1.Get("/metrics/timeseries",  queryHandler.HandleMetricsTimeseries)
```

---

## Step 7 — SDK Read Methods

Add after the existing write methods in each SDK:

### JS SDK — `sdk/js/packages/core/src/client.ts`
```typescript
async query(options: QueryOptions): Promise<EventRow[]>
async metrics(): Promise<MetricsSummary>
async timeseries(options: TimeseriesOptions): Promise<TimeseriesBucket[]>
```

### Python SDK — `sdk/python/src/watcher_sdk/client.py`
```python
def query(self, *, event_type=None, severity=None, from_=None, to=None, limit=50) -> list[dict]:
def metrics_summary(self, *, from_, to) -> dict:
def metrics_timeseries(self, *, from_, to, interval="1h") -> list[dict]:
```

### Go SDK — `sdk/go/client.go`
```go
func (c *Client) Query(ctx context.Context, opts QueryOptions) ([]Event, error)
func (c *Client) MetricsSummary(ctx context.Context, opts MetricsOptions) (*MetricsSummary, error)
```

---

## Step 8 — Gateway Docs Update

**File:** `apps/gateway-go/docs/api.md` — add all new GET endpoints with params, examples, and error codes.

**File:** `apps/gateway-go/docs/configuration.md` — document `READ_RATE_LIMIT_*` env vars if added.

**Files:** SDK `api.md` files for all 4 SDKs — add query/metrics method docs.

**File:** `apps/console/src/content/docs/api/ingestion.mdx` — rename to `events.mdx` or add a sibling `querying.mdx` covering the read API.

---

## Implementation Order Summary

```
1.  apps/iam/prisma/schema.prisma          (add scope field + migrate)
2.  apps/gateway-go/internal/domain/apikey.go          (add Scope field)
3.  apps/gateway-go/internal/adapters/postgres/keyvalidator.go  (read scope)
4.  apps/gateway-go/internal/transport/middleware/auth.go       (store scope in locals)
5.  apps/gateway-go/internal/adapters/redis/read_ratelimiter.go (new)
6.  apps/gateway-go/internal/ports/event_query.go              (new)
7.  apps/gateway-go/internal/adapters/clickhouse/event_query_adapter.go (new)
8.  apps/gateway-go/internal/usecases/query_events.go          (new)
9.  apps/gateway-go/internal/usecases/query_trace.go           (new)
10. apps/gateway-go/internal/usecases/query_metrics.go         (new)
11. apps/gateway-go/internal/transport/handlers/query.go       (new)
12. apps/gateway-go/internal/transport/server.go               (register routes)
13. SDK read methods (all 4 SDKs)
14. Docs sync (gateway api.md, SDK api.md files, console MDX)
15. apps/console/src/app/(dashboard)/settings/api-keys/page.tsx (scope selector)
```

---

## Key Constraints

- **IAM owns the `apikey` table** — scope is added via Prisma migration in `apps/iam/`, not a raw SQL migration in `infrastructure/postgres/migrations/` (Rule 9).
- **Read endpoints must not appear until scope is enforced.** If the handlers are registered before the auth middleware checks scope, any write-scoped key gets read access. Ship Step 1 (scope) before Step 6 (handlers).
- **ClickHouse queries must always include `organization_id = {orgID}`** — cross-org data leaks are a critical security issue. The `EventQuery` struct makes `OrgID` a required non-optional field.
- **No `DELETE` or `ALTER` in the read adapter** — the `EventQueryRepository` interface only exposes SELECT methods. The adapter must never accept write queries.
- **`search` param uses `ILIKE`** — ClickHouse supports case-insensitive search. Wildcard `%` is applied server-side: `message ILIKE '%' || {search} || '%'`. Do not pass wildcards from user input.
