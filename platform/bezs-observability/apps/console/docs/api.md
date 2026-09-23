# Dashboard API Routes

All routes require an authenticated session cookie (set by `/api/auth/*`).

## Auth routes

Handled by better-auth via the catch-all:

```
POST /api/auth/sign-in/email       — email + password login
POST /api/auth/sign-out            — sign out
GET  /api/auth/session             — get current session
GET  /api/auth/api-key/list        — list API keys for the active user
POST /api/auth/api-key/create      — create a new API key
POST /api/auth/api-key/delete      — revoke an API key
```

## Event query routes

All event routes accept the following query parameters:

| Param    | Type   | Description                             |
|----------|--------|-----------------------------------------|
| orgId    | string | Must match the session's active org     |
| limit    | number | Max rows to return (default: 50)        |
| offset   | number | Pagination offset (default: 0)          |
| search   | string | Full-text search on `message` field     |
| severity | string | Filter by severity level                |

### GET /api/events/overview

Returns aggregate stats and hourly buckets for the last 24 hours.

Response:
```json
{
  "stats": {
    "total_events": 12483,
    "error_count": 42,
    "audit_count": 1200,
    "log_count": 9800,
    "trace_count": 1200,
    "metric_count": 283,
    "unique_users": 18,
    "unique_apps": 4
  },
  "buckets": [
    { "hour": "00:00", "count": 520, "error_count": 2 }
  ]
}
```

### GET /api/events/audit

Returns paginated audit events (`event_type = 'audit'`).

### GET /api/events/logs

Returns paginated log events (`event_type = 'log'`).

### GET /api/events/traces

Returns paginated trace events (`event_type = 'trace'`).

### GET /api/events/metrics

Returns paginated metric events (`event_type = 'metric'`).

All event routes return an array of `EventRow` objects — see `src/lib/clickhouse.ts`
for the full field list.

All four event routes also accept an optional `appId` query parameter:

| Param | Type   | Description                                              |
|-------|--------|----------------------------------------------------------|
| appId | string | Filter results to a specific app's `application_id`. Omit for all apps. |

## App management routes

All routes require an authenticated session. The org is read from the session — it is
never accepted as a query param to prevent cross-tenant access.

### GET /api/apps

Returns all applications registered for the authenticated org, newest first.

```json
[
  {
    "id": "50d1064f-1f69-4b12-b61d-afb78e1a8d38",
    "organization_id": "org_...",
    "name": "Payments API",
    "slug": "payments-api",
    "created_at": "2026-05-26T10:00:00Z"
  }
]
```

### POST /api/apps

Create a new application. The slug is auto-generated from the name.

Request body:
```json
{ "name": "Payments API" }
```

Returns the created app (201). Returns 409 if the slug already exists for this org.

### DELETE /api/apps/[appId]

Delete an application. Existing API keys linked to this app have their `app_id` set to
`NULL` (they become unscoped org keys) — they are **not** deleted.

### GET /api/apps/[appId]/keys

List all API keys currently linked to the given application.

### POST /api/apps/[appId]/keys

Link an existing API key to an application.

Request body:
```json
{ "keyId": "key_..." }
```

### POST /api/apps/unlink-key

Remove the app association from a key (sets `apikey.app_id = NULL`).

Request body:
```json
{ "keyId": "key_..." }
```

## Public token routes

Public tokens (`wpub_` prefix) are browser-safe keys with origin allowlists and per-minute
rate limits. These routes proxy to IAM's `/api/internal/public-tokens` — IAM owns the token
records and the only place they are stored.

All routes require an authenticated session with an active organisation.

### GET /api/public-tokens

List all public tokens for the session's active org. Never returns the raw token value.

```json
{
  "tokens": [
    {
      "id": "abc123",
      "name": "my-app-browser",
      "start": "wpub_xy",
      "enabled": true,
      "allowedOrigins": ["https://myapp.com"],
      "minuteRateLimit": 1000,
      "appId": "50d1064f-1f69-4b12-b61d-afb78e1a8d38",
      "createdAt": "2026-05-27T10:00:00Z",
      "lastRequest": null
    }
  ]
}
```

`appId` is the Application ID the token is linked to, or `null` when org-level.

### POST /api/public-tokens

Create a public token. Returns the raw token **once** — it is never stored and never retrievable again.

Request body:
```json
{
  "name": "my-app-browser",
  "allowedOrigins": ["https://myapp.com", "https://staging.myapp.com"],
  "minuteRateLimit": 1000,
  "appId": "50d1064f-1f69-4b12-b61d-afb78e1a8d38"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | |
| `allowedOrigins` | Yes | Non-empty array, max 10. Must start with `https://` or `http://localhost` |
| `minuteRateLimit` | No | Defaults to 1 000, max 10 000 |
| `appId` | No | Links the token to an Application so browser events appear alongside server events in the dashboard. Must belong to the active org. |

Response (201):
```json
{
  "token": "wpub_...",
  "id": "abc123",
  "name": "my-app-browser",
  "start": "wpub_xy",
  "allowedOrigins": ["https://myapp.com"],
  "minuteRateLimit": 1000,
  "appId": "50d1064f-1f69-4b12-b61d-afb78e1a8d38",
  "createdAt": "2026-05-27T10:00:00Z"
}
```

### DELETE /api/public-tokens?id=xxx

Revoke a public token by its DB id. Only tokens belonging to the session's active org can be revoked.
The route verifies ownership before forwarding to IAM so one org cannot revoke another org's tokens.
