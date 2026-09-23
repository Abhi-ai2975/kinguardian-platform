# Gateway — Overview

## What Is This?

The Gateway is the **single entry point** for all telemetry data entering the Watcher24 platform.

Every SDK — whether Python, JavaScript, Go, or Rust — sends events exclusively to this service.
No application ever writes directly to ClickHouse, Redis, or any database.

---

## Why Go?

Go was chosen for the gateway because:

- **High concurrency** — goroutines handle thousands of simultaneous connections cheaply
- **Low latency** — compiled, no GC pauses at the scale we operate at
- **Excellent networking** — the standard library and ecosystem are built for network services
- **Small memory footprint** — critical when running under high ingestion load

---

## Responsibility

The gateway does exactly **five things** in order:

```
1. Authenticate   — Is this API key valid? Which org does it belong to? What type is it?
2. Enforce        — Public tokens: is the Origin allowed? Is the per-minute rate cap reached?
3. Validate       — Is the event payload well-formed?
4. Enrich         — Add metadata the SDK cannot know (IP, ingestion timestamp, region, source)
5. Publish        — Write the event to the correct Redis Stream topic
```

It does **not**:

- Write to ClickHouse (that is the worker's job)
- Process or aggregate events
- Store anything persistently
- Know about dashboards or queries

---

## Where It Fits

```
SDK
  ↓  HTTP POST (JSON payload + API key)
Gateway          ← this service
  ↓  XADD
Redis Streams
  ↓  XREADGROUP
Python Workers
  ↓  Bulk INSERT
ClickHouse
```

---

## Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 8080 | HTTP | Telemetry ingestion API |

---

## Event Flow (single request)

```
Request arrives at POST /v1/events
  ↓
Auth middleware extracts API key from Authorization header
  ↓
KeyValidator queries IAM database (postgres:5433/iam)
  checks: key hash matches, enabled=true, not expired
  returns: organization_id, application_id, keyType, allowedOrigins, minuteRateLimit
  ↓
Public token enforcement (if keyType = "public")
  - Origin header must be in allowedOrigins → 403 if not
  - Redis INCR per minute window must be within minuteRateLimit → 429 if not
  ↓
Handler parses and validates the JSON body
  ↓
Enricher adds: ingested_at, ip_address, sdk_version, region
             source = "browser" (public token) | "server" (secret key)
  ↓
Publisher maps event_type → Redis Stream topic
  XADD stream:audit / stream:logs / stream:traces / stream:metrics ...
  ↓
200 OK returned to SDK
```

---

## Redis Stream Topics

| Topic | Event Types |
|-------|------------|
| `stream:audit` | audit |
| `stream:logs` | log |
| `stream:traces` | trace |
| `stream:metrics` | metric |
| `stream:security` | security |
| `stream:frontend` | frontend |
| `stream:ai` | ai |
| `stream:system` | system, infrastructure |

---

## Further Reading

- [Architecture](./architecture.md) — clean architecture layers in detail
- [API Reference](./api.md) — endpoints, request/response schemas
- [Auth](./auth.md) — how API key validation works
- [Configuration](./configuration.md) — environment variables
