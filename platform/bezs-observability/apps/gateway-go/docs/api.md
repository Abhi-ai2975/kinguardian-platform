# Gateway — API Reference

## Authentication

All endpoints (except `/health`) require an API key.

Pass the key in the `Authorization` header:

```
Authorization: Bearer wtch_your_api_key_here
```

Or via the `X-API-Key` header:

```
X-API-Key: wtch_your_api_key_here
```

API keys are issued by the IAM service and scoped to an organization.
The gateway resolves `organization_id` from the key — you do not send it in the body.

### Key types

| Type | Prefix | Who uses it | Extra enforcement |
|------|--------|-------------|-------------------|
| Secret key | `wt_` | Server-side SDKs (Node.js, Python, Go) | Monthly plan quota only |
| Public token | `wpub_` | Browser SDKs (`@watcher/browser`, `@watcher/react`) | Origin allowlist + per-minute rate limit |

**Public token rules enforced by the gateway:**

1. **Origin allowlist** — the `Origin` header must be in the token's `allowedOrigins` list. Requests with a missing or unlisted origin are rejected with `403 ORIGIN_NOT_ALLOWED`. This prevents a leaked token from being used from any domain the owner did not explicitly allow.
2. **Per-minute rate limit** — default 1 000 events/min, configurable up to 10 000. Exceeding the cap returns `429 RATE_LIMIT_EXCEEDED`. Implemented with Redis INCR+EXPIRE per minute window.
3. **Source tagging** — events from public tokens are automatically tagged `"source": "client"`. Events from secret keys are tagged `"source": "server"`. This is set by the gateway and cannot be overridden by the client.

---

## Endpoints

### POST /v1/events

Generic event ingestion. Accepts any event type.

**Request body:**

```json
{
  "application_id": "billing-api",
  "environment": "production",
  "event_type": "audit",
  "severity": "info",
  "message": "User logged in",
  "timestamp": "2026-05-25T10:00:00Z",
  "trace_id": "abc123",
  "span_id": "xyz456",
  "parent_span_id": "",
  "user_id": "user_001",
  "session_id": "sess_abc",
  "payload": {
    "ip": "1.2.3.4",
    "method": "email"
  }
}
```

**Required fields:** `event_type`, `severity`, `message`

**Optional fields:** all others — defaults applied where possible

**event_type values:** `audit` `log` `metric` `trace` `security` `frontend` `ai` `system` `infrastructure`

**severity values:** `debug` `info` `warn` `error` `critical`

---

### POST /v1/logs

Shorthand for `event_type: "log"`. Same body as `/v1/events` minus `event_type`.

---

### POST /v1/traces

Shorthand for `event_type: "trace"`. Same body as `/v1/events` minus `event_type`.

---

### POST /v1/metrics

Shorthand for `event_type: "metric"`. Same body as `/v1/events` minus `event_type`.

---

### POST /v1/audit

Shorthand for `event_type: "audit"`. Same body as `/v1/events` minus `event_type`.

---

### GET /health

Returns the health status of the gateway and its dependencies.

**Response:**

```json
{
  "status": "ok",
  "redis": "ok",
  "iam_db": "ok"
}
```

No authentication required.

---

## Batch Ingestion

Send multiple events in a single request by passing an array:

```json
[
  { "event_type": "log", "severity": "info", "message": "Request started" },
  { "event_type": "log", "severity": "info", "message": "Request completed" }
]
```

Max batch size: **500 events per request.**

---

## Error Responses

All errors follow this shape:

```json
{
  "error": "human readable message",
  "code": "ERROR_CODE"
}
```

| HTTP Status | Code | Meaning |
|-------------|------|---------|
| 400 | `INVALID_PAYLOAD` | Body is not valid JSON or missing required fields |
| 401 | `MISSING_API_KEY` | No API key provided |
| 401 | `INVALID_API_KEY` | Key not found, disabled, or expired |
| 403 | `ORIGIN_NOT_ALLOWED` | Public token: `Origin` header is missing or not in the token's allowlist |
| 413 | `BATCH_TOO_LARGE` | More than 500 events in one request |
| 429 | `EVENT_LIMIT_EXCEEDED` | Org has reached their monthly event quota |
| 429 | `RATE_LIMIT_EXCEEDED` | Public token: per-minute rate cap exceeded |
| 500 | `INTERNAL_ERROR` | Gateway or queue failure |

---

## Enriched Fields

The gateway automatically adds these fields to every event before publishing.
You do not send these — they are set server-side:

| Field | Value |
|-------|-------|
| `organization_id` | Resolved from API key |
| `ingested_at` | Server UTC timestamp at ingestion time |
| `source` | `"client"` for public tokens, `"server"` for secret keys — set by gateway, not from request |
| `service_name` | From `X-Service-Name` header — developer-set component label (e.g. "payment-api", "ai-agent") |
| `ip_address` | Client IP from request |
| `sdk_version` | From `X-SDK-Version` header (optional) |
| `runtime` | From `X-Runtime` header (optional) |
| `region` | Server region (from `GATEWAY_REGION` env var) |
