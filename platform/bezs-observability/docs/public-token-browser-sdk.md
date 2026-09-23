# Public Token — Browser SDK Security Plan

## Problem Statement

The existing secret API key (`wtch_` prefix) is designed for server-side use only.
It must never appear in browser JavaScript — it would be visible in the network tab,
source maps, and JS bundles, allowing anyone to steal it and flood the event quota
or inject fake telemetry.

Pure React SPAs (Vite, CRA) have no server component, so the Option A proxy pattern
is not viable without requiring customers to run a separate backend. The solution is
a **second key type**: a public write-only token designed for safe browser exposure.

---

## Concept: Two Key Types

| Property              | Secret API Key (`wtch_`)       | Public Token (`wpub_`)              |
|-----------------------|--------------------------------|-------------------------------------|
| Where used            | Server-side only               | Browser / client-side               |
| Safe to expose        | No — never in JS bundle        | Yes — designed for it               |
| Access                | Full ingest + future read APIs | Write-only (ingest endpoints only)  |
| Rate limit            | Monthly plan quota             | Monthly quota + per-minute hard cap |
| Origin restriction    | None (server controls origin)  | CORS allowlist (domains you register)|
| Created in console    | Yes                            | Yes (separate section)              |
| Linked to application | Optional                       | Required                            |

---

## Architecture Overview

```
Secret Key flow (server-side):
  Your Server → wtch_xxx → Gateway → validates org + plan limit → Redis stream

Public Token flow (browser):
  Browser → wpub_xxx + Origin header → Gateway
              ↓
          Is origin in allowedOrigins?  No  → 403 Forbidden
              ↓ Yes
          Is route ingest-only?          No  → 403 Forbidden
              ↓ Yes
          Per-minute rate limit hit?     Yes → 429 Too Many Requests
              ↓ No
          Monthly plan quota hit?        Yes → 429 Event Limit Exceeded
              ↓ No
          Publish to Redis stream ✓
```

---

## Phase 1 — Database Schema (IAM Postgres)

### Changes to the `api_key` table

Add two new columns to the existing Better Auth `api_key` table:

```sql
ALTER TABLE api_key
  ADD COLUMN "keyType"        TEXT    NOT NULL DEFAULT 'secret',
  ADD COLUMN "allowedOrigins" TEXT[]  NOT NULL DEFAULT '{}',
  ADD COLUMN "minuteRateLimit" INTEGER NOT NULL DEFAULT 1000;
```

| Column           | Type      | Description                                              |
|------------------|-----------|----------------------------------------------------------|
| `keyType`        | `TEXT`    | `'secret'` or `'public'`. Default `'secret'` for all existing keys. |
| `allowedOrigins` | `TEXT[]`  | Array of allowed origins e.g. `{"https://myapp.com","https://staging.myapp.com"}`. Empty array = deny all (public tokens must have at least one). |
| `minuteRateLimit`| `INTEGER` | Max events per minute for public tokens. Default 1000. Secret keys ignore this. |

### Migration file location
```
infrastructure/migrations/iam/004_add_public_token_columns.sql
```

### Seeding / defaults
- All existing `api_key` rows get `keyType = 'secret'`, `allowedOrigins = '{}'`, `minuteRateLimit = 1000`.
- No existing behaviour changes.

---

## Phase 2 — Gateway Changes (`apps/gateway-go`)

### 2a. Domain Layer (`internal/domain/apikey.go`)

Add new fields to the `APIKey` struct:

```go
type APIKey struct {
    ID                 string
    OrganizationID     string
    AppID              string
    EventLimitPerMonth int64
    // New fields:
    KeyType        KeyType  // "secret" | "public"
    AllowedOrigins []string // empty = deny all (only relevant for public)
    MinuteRateLimit int64   // events/min cap; 0 = unlimited (secret keys)
}

type KeyType string

const (
    KeyTypeSecret KeyType = "secret"
    KeyTypePublic KeyType = "public"
)
```

Add new domain errors:

```go
var (
    ErrOriginNotAllowed   = domainError("origin not in allowlist")
    ErrPublicKeyWriteOnly = domainError("public token is write-only")
    ErrMinuteRateExceeded = domainError("per-minute rate limit exceeded")
)
```

---

### 2b. Ports Layer (`internal/ports/`)

Add a new port for per-minute rate limiting:

```go
// MinuteRateLimiter checks and increments the per-minute event count for a
// public token. Returns ErrMinuteRateExceeded when the cap is hit.
// Implemented by the Redis adapter — Redis INCR + EXPIRE gives atomic,
// TTL-based sliding window at O(1) per call.
type MinuteRateLimiter interface {
    Allow(ctx context.Context, keyID string, limitPerMinute int64) error
}
```

---

### 2c. Redis Adapter (`internal/adapters/redis/`)

Add `minute_ratelimiter.go` implementing `ports.MinuteRateLimiter`:

```
Key format:  rate:pub:{keyID}:{unix_minute}
Operation:   INCR key → if result == 1, SET EXPIRE 60
             if result > limitPerMinute → return ErrMinuteRateExceeded
```

Uses existing Redis connection — no new dependency.

---

### 2d. Postgres Adapter (`internal/adapters/postgres/keyvalidator.go`)

Extend the validation SQL to read the new columns:

```sql
SELECT
  k.id,
  k."organizationId",
  k."appId",
  k."keyType",          -- NEW
  k."allowedOrigins",   -- NEW
  k."minuteRateLimit",  -- NEW
  k."expiresAt",
  k.enabled,
  COALESCE(...) AS event_limit
FROM api_key k
...
WHERE k."keyHash" = $1
```

Scan the new columns into the `APIKey` struct.

---

### 2e. Auth Middleware (`internal/transport/middleware/auth.go`)

After key validation, add two extra checks for public tokens:

**Step 1 — Origin check:**
```go
if apiKey.KeyType == domain.KeyTypePublic {
    origin := c.Get("Origin")
    if !isOriginAllowed(origin, apiKey.AllowedOrigins) {
        return respondForbidden(c, "origin not allowed", "ORIGIN_NOT_ALLOWED")
    }
}
```

**Step 2 — Write-only route check:**
```go
if apiKey.KeyType == domain.KeyTypePublic {
    if !isIngestRoute(c.Path()) {
        return respondForbidden(c, "public token is write-only", "WRITE_ONLY_TOKEN")
    }
}
```

Ingest routes: `/v1/events`, `/v1/logs`, `/v1/traces`, `/v1/metrics`, `/v1/audit`

**Step 3 — Store key type and rate limit in locals:**
```go
c.Locals(LocalKeyType,        string(apiKey.KeyType))
c.Locals(LocalMinuteRateLimit, apiKey.MinuteRateLimit)
c.Locals(LocalAPIKeyID,        apiKey.ID)  // already stored, needed for rate limit key
```

---

### 2f. Events Handler (`internal/transport/handlers/events.go`)

Before calling the use case, check per-minute rate limit for public tokens:

```go
keyType, _ := c.Locals(middleware.LocalKeyType).(string)
if keyType == string(domain.KeyTypePublic) {
    keyID, _ := c.Locals(middleware.LocalAPIKeyID).(string)
    minuteLimit, _ := c.Locals(middleware.LocalMinuteRateLimit).(int64)
    if err := h.rateLimiter.Allow(c.Context(), keyID, minuteLimit); err != nil {
        return respondError(c, fiber.StatusTooManyRequests,
            "per-minute rate limit exceeded", "MINUTE_RATE_EXCEEDED")
    }
}
```

`EventsHandler` gets a new `rateLimiter ports.MinuteRateLimiter` dependency injected.

---

### 2g. CORS Header (`internal/transport/server.go`)

Add `Access-Control-Allow-Origin` support to the Fiber server so browsers can
actually reach the gateway. The gateway currently has no CORS config because it
only served server-side clients.

Options:
- Allow `*` with read-only methods blocked (write-only routes only) — simpler
- Reflect the `Origin` back only if it passed the allowlist check — more precise

Recommended: reflect validated origin back. Middleware sets the header after
the allowlist check passes.

```go
// In auth middleware, after allowlist check passes for public token:
c.Set("Access-Control-Allow-Origin", origin)
c.Set("Access-Control-Allow-Headers", "Content-Type, X-API-Key, Authorization, X-SDK-Version, X-Runtime")
```

Also add `OPTIONS` preflight handler on all `/v1/*` routes.

---

### 2h. `main.go` wiring

```go
// New: Redis rate limiter adapter
rateLimiter := redisadapter.NewMinuteRateLimiterAdapter(redisAdapter)

// Updated events handler with rate limiter
eventsHandler := handlers.NewEventsHandler(ingestUC, cfg.Region, rateLimiter)
```

---

### 2i. Config (`config/config.go`)

No new env vars needed — uses existing Redis connection.

---

## Phase 3 — Console UI Changes (`apps/console`)

### 3a. New page: Public Tokens

Add a new settings page at `/settings/api-keys/public-tokens` (or a tab on the
existing API keys page).

**Create public token form:**

| Field            | Type             | Required | Notes                                     |
|------------------|------------------|----------|-------------------------------------------|
| Name             | Text input       | Yes      | e.g. "Production Browser Token"           |
| Application      | Select dropdown  | Yes      | Public tokens must be app-scoped          |
| Allowed Origins  | Textarea         | Yes      | One origin per line, e.g. `https://app.com` |
| Per-minute limit | Number input     | No       | Default 1000. Range 100–10,000            |

**After creation:**
- Show the full `wpub_xxx` token once (copy-to-clipboard)
- Warn: "This token will not be shown again. Copy it now."
- Store only the hash in DB — same pattern as secret keys

**Token list view:**
- Name, application, created date, last used date
- Masked token (first 8 chars + `...`)
- Allowed origins (expandable list)
- Edit button (can update name + allowed origins, NOT the token value)
- Revoke button

---

### 3b. API route: `POST /api/console/public-tokens`

Server action / API route that:
1. Validates the session and org membership
2. Generates `wpub_` + random bytes (same generation logic as secret keys)
3. Hashes the token
4. Inserts into `api_key` with `keyType = 'public'` and the provided `allowedOrigins`
5. Returns the plaintext token once (never stored)

---

### 3c. Allowed origins validation

Before saving, validate each origin:
- Must start with `https://` (allow `http://localhost` for development)
- Must be a valid URL with no path (origin = scheme + host + port only)
- Maximum 10 origins per token

---

## Phase 4 — Browser SDK

### Package structure

```
sdk/
├── js/              ← existing server SDK (Node.js)
│   └── src/
└── browser/         ← NEW browser-specific package
    ├── src/
    │   ├── index.ts         ← createBrowserClient()
    │   ├── types.ts
    │   └── transport.ts     ← fetch-based, sends Origin automatically
    ├── package.json
    └── README.md
```

Or add a `browser` export condition to the existing JS SDK package:
```json
"exports": {
  ".": {
    "node": "./dist/node/index.js",
    "browser": "./dist/browser/index.js"
  }
}
```

### Browser client API

```ts
import { createBrowserClient } from "@watcher24/sdk/browser";

const w24 = createBrowserClient({
  publicToken: "wpub_...",    // NOT apiKey — explicit naming prevents confusion
  appId: "app_01HV...",       // optional if token is already app-scoped
  environment: "production",
});

// Same API as server SDK
await w24.log({ severity: "error", message: "Checkout failed", payload: { ... } });
await w24.trace.start("page.load");
```

### Key differences from server SDK

- Accepts `publicToken` instead of `apiKey` — compile-time differentiation
- Uses `fetch` (browser-native), not `http` module
- Does NOT need to set `Origin` header — browser sets it automatically on cross-origin requests
- Batches events locally before sending (configurable `flushInterval`, default 2s) to reduce request count
- Has `beforeunload` flush to catch events on page close

---

## Phase 5 — Documentation Updates

### Files to update / create

| File | Change |
|---|---|
| `docs/implementation-guide.md` | Add public token feature to Phase 8 or as a standalone phase |
| `sdk/browser/README.md` | New: browser SDK quickstart, public token setup |
| `apps/console/docs/api.md` | Document public token management endpoints |
| `apps/gateway-go/docs/api.md` | Document Origin header requirement, CORS headers |
| `apps/gateway-go/docs/configuration.md` | No new env vars but document CORS behaviour |

---

## Security Threat Model

| Threat | Mitigation |
|---|---|
| Stolen `wpub_` token used from attacker's domain | `allowedOrigins` CORS check — gateway rejects unknown origins |
| Stolen token used from a server (no Origin header) | Gateway treats missing Origin as not-allowed for public tokens |
| Token used to flood quota | Per-minute rate limit (1000 events/min default) limits burst damage |
| Token used to read data | Write-only enforcement — all non-ingest routes return 403 |
| Token used to inject events into another org | Token is org-scoped in DB — org is resolved server-side, not from request body |
| Customer exposes secret `wtch_` key by mistake | Console labels clearly: "Secret Key — server only" / "Public Token — browser safe" |

---

## Implementation Order

```
1. IAM DB migration (add keyType, allowedOrigins, minuteRateLimit columns)
2. Gateway domain + ports changes (APIKey struct, new errors, MinuteRateLimiter port)
3. Redis adapter (MinuteRateLimiter implementation)
4. Gateway Postgres adapter (read new columns in SQL)
5. Gateway auth middleware (origin check, write-only check, CORS headers)
6. Gateway events handler (per-minute rate limit call)
7. Gateway main.go wiring
8. Gateway tests (new middleware cases, rate limiter fake)
9. Console API route (create public token)
10. Console UI (public tokens page — list, create, revoke)
11. Browser SDK package
12. Docs update
```

---

## Open Questions (decide before implementation)

1. **Missing Origin header policy** — If a server sends a `wpub_` token with no `Origin` header, should we block it or allow it? Recommendation: **block** — if you have a server, use a secret key.

2. **`http://localhost` in allowedOrigins** — Allow during development? Recommendation: **yes**, allow `http://localhost:*` as a special case.

3. **Token prefix** — `wpub_` or something else? Recommendation: **`wpub_`** keeps it visually distinct from `wtch_`.

4. **Per-token vs per-org minute rate limit** — Rate limit per token ID (tighter) or per org (looser but simpler)? Recommendation: **per token ID** — an org might have multiple public tokens for different apps.

5. **Console placement** — Separate page `/settings/api-keys/public-tokens` or a tab on the existing `/settings/api-keys` page? Recommendation: **tab on existing page** — keeps key management in one place.
