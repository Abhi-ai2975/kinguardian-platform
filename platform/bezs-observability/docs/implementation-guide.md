# Implementation Guide — Phase by Phase

## Build Order Philosophy

Backend first, always. The gateway, queue, storage, and workers are the core product.
The dashboard is a consumer of what the backend produces — build it last when data flows end-to-end.

```text
Phase 1 → Infrastructure + Storage
Phase 2 → Go Gateway (Ingestion)
Phase 3 → Python Workers (Processing)
Phase 4 → Python SDKs
Phase 5 → JavaScript SDKs
Phase 6 → Realtime Layer (Go)
Phase 7 → Dashboard UI (Next.js)
Phase 8 → Growth (Kafka, Alerting, AI)
Phase 9 → Enterprise (K8s, SIEM, AI Copilots)
```

---

## Phase 1 — Infrastructure & Storage Foundation

**Goal:** Get all storage and infrastructure running locally via Docker Compose before writing any application code.

### Services to bring up

| Service | Purpose |
|---|---|
| PostgreSQL | Organizations, users, API keys, settings |
| ClickHouse | Logs, audit events, traces, metrics |
| Redis | Streams queue (MVP queue layer) |
| MinIO | Cold storage / archive |
| Prometheus | Infrastructure metrics |

### Deliverables

- `docker-compose.yml` at repo root with all services
- ClickHouse schema migrations for core telemetry tables
- PostgreSQL schema migrations for org/user/API key tables
- Health check scripts to verify all services are up
- `.env.example` with all required variables

### ClickHouse Tables to Create

```sql
-- Core telemetry events table
events (
  organization_id,
  application_id,
  environment,
  event_type,      -- audit | log | metric | trace | security | frontend | ai
  severity,
  message,
  timestamp,
  trace_id,
  span_id,
  user_id,
  payload         -- JSON
)

-- Partitioned by toYYYYMM(timestamp), ordered by (organization_id, event_type, timestamp)
```

### PostgreSQL Tables to Create

```sql
organizations (id, name, slug, created_at)
users (id, organization_id, email, role)
api_keys (id, organization_id, key_hash, name, created_at)
applications (id, organization_id, name, environment)
```

### Folder Structure

```text
watcher24/
├── infrastructure/
│   ├── clickhouse/
│   │   └── migrations/
│   ├── postgres/
│   │   └── migrations/
│   ├── redis/
│   └── prometheus/
├── docker-compose.yml
└── .env.example
```

---

## Phase 2 — Go Telemetry Gateway

**Goal:** Build the HTTP ingestion gateway that validates, enriches, and publishes events to Redis Streams.

### Tech

- Go
- Gin or Fiber
- Redis Streams client
- JWT / API key middleware

### Endpoints to Implement

```text
POST /v1/events     — generic event ingestion
POST /v1/logs       — log events
POST /v1/traces     — trace spans
POST /v1/metrics    — metric data points
POST /v1/audit      — audit events
GET  /health        — health check
```

### Gateway Responsibilities (in order)

1. **Authenticate** — validate API key against PostgreSQL
2. **Validate** — check event schema, size, rate limits
3. **Enrich** — add timestamp, IP, region, SDK version metadata
4. **Publish** — write to the appropriate Redis Stream topic

### Redis Stream Topics

```text
stream:logs
stream:metrics
stream:traces
stream:audit
stream:security
stream:frontend
stream:ai-events
```

### Folder Structure

```text
watcher24/
└── apps/
    └── gateway-go/
        ├── main.go
        ├── handlers/
        ├── middleware/
        │   ├── auth.go
        │   └── ratelimit.go
        ├── publisher/
        │   └── redis.go
        └── config/
```

### Done When

- Gateway starts and connects to Redis + PostgreSQL
- `POST /v1/events` with a valid API key writes an event to Redis Streams
- Invalid API keys return 401
- Events missing required fields return 400
- Rate limit exceeded returns 429

---

## Phase 3 — Python Processing Workers

**Goal:** Consume events from Redis Streams, process them, and write to ClickHouse.

### Tech

- Python
- FastAPI (for worker health/admin endpoints)
- Redis Streams consumer groups
- ClickHouse Python client
- Polars / Pandas for analytics

### Worker Services to Build

| Service | Consumes | Writes |
|---|---|---|
| `log-worker` | `stream:logs` | ClickHouse events table |
| `audit-worker` | `stream:audit` | ClickHouse events table |
| `trace-worker` | `stream:traces` | ClickHouse events table |
| `metric-worker` | `stream:metrics` | Prometheus / ClickHouse |
| `alert-engine` | All streams | PostgreSQL alerts table |

### Processing Steps Per Worker

```text
1. Read batch from Redis Stream consumer group
2. Parse and validate event schema
3. Normalize fields (timestamps, IDs, severity)
4. Aggregate if needed (metrics)
5. Bulk insert into ClickHouse
6. Acknowledge message in Redis Stream
```

### Folder Structure

```text
watcher24/
└── apps/
    └── analytics-python/
        ├── workers/
        │   ├── log_worker.py
        │   ├── audit_worker.py
        │   ├── trace_worker.py
        │   └── metric_worker.py
        ├── storage/
        │   └── clickhouse.py
        ├── queue/
        │   └── redis_consumer.py
        └── main.py
```

### Done When

- Worker consumes from Redis Stream and inserts into ClickHouse
- Bulk insert works with batches of 100–1000 events
- Consumer group offset is only acknowledged after successful ClickHouse write
- Dead letter handling for malformed events

---

## Phase 4 — Python SDK

**Goal:** Build the Python SDK so FastAPI/Django apps can send telemetry without knowing about the gateway internals.

### Packages

```text
platform-sdk-python    — core SDK
platform-sdk-fastapi   — FastAPI auto instrumentation
platform-sdk-django    — Django auto instrumentation
```

### SDK Core Features

```python
from platform_sdk import Client

client = Client(api_key="...", app_id="billing-api", env="production")

# Manual event
client.audit("patient.updated", user_id="u_123", payload={"patient_id": "p_001"})
client.log("warn", "Slow query detected", payload={"query_time_ms": 450})

# Auto instrumentation (FastAPI)
from platform_sdk.fastapi import instrument
instrument(app, client)
```

### SDK Internals

```text
Event
  ↓
Memory Buffer (thread-safe queue)
  ↓
Background flush thread (every 500ms or 100 events)
  ↓
Batch POST to Gateway /v1/events
  ↓
Retry with exponential backoff on failure
```

### Folder Structure

```text
watcher24/
└── sdk/
    └── python/
        ├── platform_sdk/
        │   ├── client.py
        │   ├── buffer.py
        │   ├── transport.py
        │   ├── retry.py
        │   └── integrations/
        │       ├── fastapi.py
        │       └── django.py
        └── pyproject.toml
```

---

## Phase 5 — JavaScript / TypeScript SDK

**Goal:** Build the JS SDK ecosystem for Node.js, browser, React, and Next.js apps.

### Packages

```text
@watcher/core      — shared types and transport
@watcher/node      — Node.js SDK (server-side)
@watcher/browser   — Browser SDK (frontend errors, performance)
@watcher/react     — React error boundaries, hooks
@watcher/nextjs    — Next.js middleware + auto instrumentation
```

### Node SDK Core

```typescript
import { Client } from '@watcher/node'

const client = new Client({ apiKey: '...', appId: 'billing-api', env: 'production' })

client.audit('user.login', { userId: 'u_123' })
client.log('error', 'Payment failed', { orderId: 'o_456' })
```

### Folder Structure

```text
watcher24/
└── sdk/
    └── js/
        ├── packages/
        │   ├── core/
        │   ├── node/
        │   ├── browser/
        │   ├── react/
        │   └── nextjs/
        └── package.json   (pnpm workspace)
```

---

## Phase 6 — Realtime Layer (Go)

**Goal:** Build the Go service that fans out live events to connected dashboard clients via WebSocket / SSE.

### Tech

- Go
- WebSocket (gorilla/websocket or nhooyr/websocket)
- Redis Streams (subscribe to processed events)
- SSE fallback

### How It Works

```text
ClickHouse insert triggers notification
  ↓
Realtime service reads from Redis pub/sub or stream tail
  ↓
Fan out to connected WebSocket clients
  ↓
Dashboard receives live event
```

### Subscription Model

```text
Client subscribes to:
  - org_id + event_type
  - org_id + app_id
  - org_id + environment

Server pushes matching events in realtime
```

### Folder Structure

```text
watcher24/
└── apps/
    └── realtime-go/
        ├── main.go
        ├── hub/
        │   └── hub.go       — connection registry + fanout
        ├── handlers/
        │   └── ws.go
        └── subscriber/
            └── redis.go
```

---

## Phase 7 — Dashboard UI (Next.js)

**Goal:** Build the frontend dashboard once data flows end-to-end from SDK → Gateway → Queue → ClickHouse.

### Tech

```text
Next.js 14+ (App Router)
TypeScript
TailwindCSS
TanStack Query
Recharts or ECharts
WebSocket hooks
```

### Pages to Build (in priority order)

1. **Audit Explorer** — search, filter, timeline of audit events
2. **Log Explorer** — full-text search, severity filter, realtime stream
3. **Metrics Dashboard** — CPU, memory, request throughput charts
4. **Trace Explorer** — span waterfall, distributed trace view
5. **AI Observability** — agent traces, prompt history, token usage
6. **Settings** — org management, API keys, applications

### API Layer

Dashboard calls a **Backend-for-Frontend (BFF)** API, not ClickHouse directly.

```text
Dashboard (Next.js)
  ↓
API routes (Next.js API or separate Go service)
  ↓
ClickHouse queries
```

### Folder Structure

```text
watcher24/
└── apps/
    └── dashboard-nextjs/
        ├── app/
        │   ├── audit/
        │   ├── logs/
        │   ├── metrics/
        │   ├── traces/
        │   ├── ai/
        │   └── settings/
        ├── components/
        ├── hooks/
        │   └── useRealtimeStream.ts
        └── lib/
```

---

## Phase 8 — Growth Features

**Goal:** Add Kafka, distributed alerting, AI analytics, and deeper tracing.

### Kafka Migration

Replace Redis Streams with Kafka for production scale.

```text
Gateway publishes to Kafka topics (same topic names as Redis Streams)
Workers become Kafka consumer groups
Redis Streams can remain as cache layer
```

### Alert Engine

```python
# Rule-based alerting
rules = [
    Rule("cpu > 90% for 5 min", severity="critical", notify=["slack", "email"]),
    Rule("error_rate > 5%", severity="warning", notify=["slack"]),
    Rule("audit: login_failed > 10 in 1 min", severity="high", notify=["pagerduty"]),
]
```

### AI Analytics Worker

```text
Anomaly detection on metrics (Isolation Forest / Z-score)
Error clustering (similar errors grouped)
Root cause suggestions (correlated events)
```

---

## Phase 9 — Enterprise

**Goal:** Production-grade deployment, security, compliance, and enterprise features.

### Infrastructure

- Kubernetes + Helm charts for all services
- Terraform for cloud provisioning
- GitHub Actions CI/CD pipelines
- Horizontal pod autoscaling for gateway and workers

### Security

- RBAC with organization roles
- SSO / OAuth integration
- Audit log immutability (append-only ClickHouse, no deletes)
- Encryption at rest + TLS everywhere
- Secret management (Vault or cloud KMS)

### Enterprise Features

- SIEM capabilities (threat detection rules)
- OpenTelemetry (OTLP) ingestion endpoint
- Data retention policies per organization
- Compliance exports (SOC2, HIPAA audit trails)
- AI copilot for log summarization and incident analysis

---

## Summary Checklist

| Phase | Component | Status |
|---|---|---|
| 1 | Docker Compose + PostgreSQL + ClickHouse + Redis | ⬜ |
| 2 | Go Gateway (HTTP ingestion + Redis publish) | ⬜ |
| 3 | Python Workers (Redis consume + ClickHouse write) | ⬜ |
| 4 | Python SDK (core + FastAPI auto instrumentation) | ⬜ |
| 5 | JavaScript SDK (core + node + browser) | ⬜ |
| 6 | Realtime Go service (WebSocket fanout) | ⬜ |
| 7 | Next.js Dashboard (Audit, Logs, Metrics UI) | ⬜ |
| 8 | Kafka + Alert Engine + AI Analytics | ⬜ |
| 9 | Kubernetes + Helm + Enterprise features | ⬜ |

---

## Recommended First Steps This Week

1. Create `docker-compose.yml` with PostgreSQL, ClickHouse, Redis, MinIO
2. Write ClickHouse migration for the `events` table
3. Write PostgreSQL migration for `organizations`, `api_keys`, `applications`
4. Verify all services start and are queryable
5. Start the Go Gateway skeleton with `POST /v1/events` → Redis Streams

Do not touch the frontend until Phase 3 is complete and real data flows into ClickHouse.
