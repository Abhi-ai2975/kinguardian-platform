---
name: sdk-gateway-spec
description: Canonical Watcher24 gateway ingestion API reference. Use this when building or updating any SDK to know the exact endpoint, headers, JSON body shape, and response codes the gateway expects.
---

# Watcher24 Gateway — Ingestion API Spec

This is the single source of truth for what every SDK must implement against.
The gateway lives at `apps/gateway-go/`.

---

## Endpoint

```
POST https://ingest.watcher24.io/v1/events
```

The gateway also accepts typed shortcuts that force `event_type` automatically:

| Path | Forced event_type |
|------|------------------|
| `POST /v1/events` | From body (generic) |
| `POST /v1/logs` | `"log"` |
| `POST /v1/traces` | `"trace"` |
| `POST /v1/metrics` | `"metric"` |
| `POST /v1/audit` | `"audit"` |

SDKs always use `/v1/events` and set `event_type` in the body.

---

## Request headers

| Header | Required | Value |
|--------|----------|-------|
| `Authorization` | **Yes** | `Bearer <apiKey>` |
| `Content-Type` | **Yes** | `application/json` |
| `X-SDK-Version` | Yes | SDK semver string (e.g. `"0.1.0"`) |
| `X-Runtime` | Yes | Runtime + version (e.g. `"node/20.11.0"`, `"python/3.11.4"`, `"go/go1.21.0"`, `"rust/1.76"`) |
| `X-Environment` | Yes | Deployment stage (e.g. `"production"`, `"staging"`) |
| `X-App-ID` | No | Application ID — only when `appId` is set in ClientOptions |
| `X-Service-Name` | No | Component label — only when `serviceName` is set in ClientOptions |

---

## Request body

The gateway accepts **either a single object or a JSON array**. SDKs always send an array (even for a single event) for consistency.

```json
[
  {
    "event_type": "audit",
    "severity":   "info",
    "message":    "user.login",
    "user_id":    "u_abc123",
    "session_id": "sess_xyz",
    "trace_id":   "trace-001",
    "span_id":    "span-1",
    "parent_span_id": "",
    "payload": {
      "method": "email",
      "ip": "203.0.113.1"
    }
  }
]
```

### Field reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `event_type` | string | **Yes** | One of the valid event types below |
| `severity` | string | **Yes** | One of the valid severities below |
| `message` | string | **Yes** | Non-empty human-readable description |
| `user_id` | string | No | Omit or empty string if not applicable |
| `session_id` | string | No | |
| `trace_id` | string | No | |
| `span_id` | string | No | |
| `parent_span_id` | string | No | |
| `payload` | object | No | Arbitrary JSON. Omit entirely if not used (don't send `null`) |

### Valid event_type values

```
"audit"  "log"  "trace"  "metric"  "event"
"security"  "ai"  "system"  "infrastructure"
```

### Valid severity values

```
"debug"  "info"  "warn"  "error"  "critical"
```

---

## Typed method defaults

Each typed SDK method fixes `event_type` and a default `severity`:

| SDK method | event_type | severity |
|------------|-----------|---------|
| `audit(message)` | `"audit"` | `"info"` |
| `log(severity, message)` | `"log"` | caller sets |
| `trace(message)` | `"trace"` | `"info"` |
| `metric(message)` | `"metric"` | `"info"` |
| `event(type, severity, message)` | caller sets | caller sets |

---

## Response

### Success

```
HTTP 200
{ "status": "ok" }
```

For batches:
```json
{ "status": "ok", "count": 42 }
```

### Errors

```
HTTP 400  Bad request (invalid JSON, missing required field)
HTTP 401  Unauthorized (invalid or missing API key)
HTTP 403  Forbidden (origin not allowed for public tokens; plan limit exceeded)
HTTP 429  Rate limit exceeded (public token minute rate limit)
HTTP 5xx  Server error — retry
```

Error body:
```json
{ "error": "descriptive message", "code": "ERROR_CODE" }
```

**Retry policy**: retry on network errors and 5xx. Never retry 4xx — the same batch will fail again.

Recommended backoff delays: `[100ms, 200ms, 400ms]` (3 retries after first attempt).

---

## API key types

| Prefix | Type | Used for |
|--------|------|----------|
| `wtch_` | Secret key | Server-side SDKs — Go, Python, Rust, Node.js |
| `wpub_` | Public token | Browser SDKs only — has origin allowlist + minute rate limit |

Public tokens are never used in server-side SDKs. Secret keys must never ship to the browser.

---

## Batching behaviour

All SDKs buffer events in memory and send in batches:

- **Size trigger**: flush when buffer reaches `flushAt` events (default: 100)
- **Time trigger**: flush every `flushInterval` ms (default: 500ms)
- **Explicit flush**: user calls `flush()` / `Flush()` — blocks until sent
- **Shutdown flush**: `shutdown()` / `Shutdown()` — final flush before process exit
- **Max buffer**: when full, drop the **oldest** event (prefer new data over blocking)
- **Overflow default**: 10,000 events
