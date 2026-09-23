# Multi-App Support

> **Status: Implemented** (migration 002, gateway v+AppID, console Settings → Apps)

## Background

Watcher24 is a multi-tenant observability platform. Each customer (an **organisation**) monitors
multiple of their own applications — a web frontend, a mobile app, a backend API, a background
worker, an AI agent, etc. These are called **Apps**.

Currently `application_id` is a free-form string set manually in the SDK config. Anyone holding
the organisation API key can claim any `application_id`. There is no formal entity, no isolation,
and no per-app key management. This document describes how to fix that.

---

## Concept Model

```
Organisation (Acme Corp)
 ├── App: payments-api      → API Key: wtch_abc...  (production)
 │                          → API Key: wtch_abd...  (staging)
 ├── App: checkout-web      → API Key: wtch_xyz...
 ├── App: mobile-ios        → API Key: wtch_mno...
 └── App: data-pipeline     → API Key: wtch_pqr...
```

- An **Organisation** owns one or more **Apps**.
- An **App** is any instrumented target: web, mobile, server, agent, etc.
- Each App has one or more **API Keys** scoped to it.
- The SDK uses a key. The gateway resolves `org_id` + `app_id` from that key automatically.
- The SDK user never has to manually set `appId` — it is baked into the key.

---

## What IAM Is (and Is Not) Responsible For

| Concern | Owner |
|---------|-------|
| Console user login / signup | IAM (better-auth) |
| Organisation membership, teams | IAM (better-auth) |
| API key storage and validation | IAM (`apikey` table) |
| **App entity (name, slug, id)** | **Console database / new `apps` table** |
| Events, traces, metrics, audit logs | ClickHouse |

IAM stores the API key and a reference to which App that key belongs to (`app_id` column).
The App entity itself (name, slug, settings) lives separately — not inside better-auth.

---

## Database Changes

### 1. New `apps` table (IAM PostgreSQL database)

```sql
CREATE TABLE apps (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  org_id      TEXT NOT NULL,          -- references the better-auth org
  name        TEXT NOT NULL,          -- display name: "Payments API"
  slug        TEXT NOT NULL,          -- url-safe: "payments-api"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (org_id, slug)
);

CREATE INDEX apps_org_id_idx ON apps (org_id);
```

### 2. Add `app_id` column to the `apikey` table (IAM PostgreSQL database)

```sql
ALTER TABLE apikey ADD COLUMN app_id TEXT REFERENCES apps(id) ON DELETE SET NULL;
CREATE INDEX apikey_app_id_idx ON apikey (app_id);
```

This is the only connection: a key knows which App it belongs to.

---

## Gateway Changes (`apps/gateway-go`)

### Key validation (`internal/adapters/postgres/keyvalidator.go`)

Extend the existing query to also fetch `app_id` from the `apikey` row:

```sql
SELECT a.id, a."referenceId", a.enabled, a."expiresAt", a.permissions,
       a.app_id,
       uc."activeOrganizationId"
FROM apikey a
LEFT JOIN "userContext" uc ON uc."userId" = a."referenceId"
WHERE a.key = $1
LIMIT 1
```

### Domain model (`internal/domain/apikey.go`)

Add `AppID` to the `APIKey` struct:

```go
type APIKey struct {
  ID             string
  OrganizationID string
  AppID          string     // resolved from the key — may be empty for legacy keys
  Permissions    *string
  ExpiresAt      *time.Time
}
```

### Event ingestion (`internal/transport/handlers/ingest.go`)

When storing an event, prefer the key-resolved `AppID` over the `x-app-id` header.
Fall back to the header only if the key has no `app_id` (backwards compatibility):

```go
appID := apiKey.AppID
if appID == "" {
  appID = c.Get("x-app-id") // legacy / SDK-provided fallback
}
```

---

## Console Changes (`apps/console`)

### App management pages

| Route | Purpose |
|-------|---------|
| `/settings/apps` | List all apps in the org |
| `/settings/apps/new` | Create a new app (name → auto-slug) |
| `/settings/apps/[slug]` | App settings: rename, delete, view its keys |
| `/settings/apps/[slug]/keys` | Create / revoke API keys scoped to this app |

### App selector in the dashboard nav

A dropdown in the top nav that lets the user switch between apps:

```
[Acme Corp ▾] → [All Apps] [payments-api] [checkout-web] [mobile-ios]
```

Selected app is stored in a URL search param or a cookie so it persists across navigation.

### Explorer filtering

Every explorer page (Audit, Logs, Traces, Metrics) passes the selected `app_id` as a filter
to the ClickHouse query alongside `org_id`. When "All Apps" is selected, no `app_id` filter
is applied.

### API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/apps` | GET | List apps for the authed org |
| `/api/apps` | POST | Create a new app |
| `/api/apps/[appId]` | DELETE | Delete an app |
| `/api/apps/[appId]/keys` | POST | Create an API key scoped to an app |

---

## SDK Changes

### `appId` becomes optional

After this change, when a key is created scoped to a specific app, the SDK no longer needs
`appId` in its config. The gateway resolves it from the key.

```ts
// Before
createNextServerClient({ apiKey: "wtch_...", appId: "payments-api", ... })

// After — appId inferred from key, no manual config needed
createNextServerClient({ apiKey: "wtch_...", ... })
```

For backwards compatibility, if the SDK still passes `appId` and the key has no `app_id`,
the gateway falls back to the header value. This keeps existing integrations working.

---

## How `appId` Resolution Works

The gateway resolves `application_id` from **one source only**:

```
apikey.app_id column — set when the key is linked to an app in the console
```

Any `appId` value in the SDK config or request body is **always ignored**. If the key
has no linked app, `application_id` is stored as empty — regardless of what the SDK sends.

### Key linked to an app ✅

When you link a key to an app via **Settings → Apps → Link key**, the `apikey.app_id`
column is set to that app's UUID. Every event sent with that key gets that app's ID.

```
Key linked to: payments-api (50d1064f-...)
SDK config:    appId: "anything"  ← ignored
Stored as:     application_id = "50d1064f-..."
```

### Key NOT linked to any app

`application_id` is always stored as `""`. The SDK `appId` config is ignored.

```
Key linked to: nothing (NULL)
SDK config:    appId: "50d1064f-..."  ← ignored
Stored as:     application_id = ""
Console view:  shows in "All Apps" only
```

### Summary table

| Key linked to app? | SDK `appId` | `application_id` stored | App filter works? |
|--------------------|-------------|------------------------|-------------------|
| ✅ Yes | anything | key's app UUID | ✅ Yes |
| ❌ No | anything | `""` (empty) | ❌ No |

> 💡 **Bottom line**: link your API key to an app in the console. That is the only way
> events are tagged with an `application_id`.

---

## Migration Strategy (zero downtime)

1. **Add `apps` table** and `app_id` column to `apikey` — both nullable, no breaking change.
2. **Deploy gateway** with updated key validator — new `app_id` field defaults to empty, falls back to `x-app-id` header. Existing SDK integrations keep working unchanged.
3. **Deploy console** with App management UI — customers can register apps and create scoped keys.
4. **Customers migrate** at their own pace: create an app, generate a scoped key, swap the key in their SDK config. Old org-scoped keys continue working during the transition.
5. (Future) Optionally deprecate org-scoped keys with no `app_id`.

---

## Implementation Order

```
✅ 1. DB migration       — applications table + app_id column on apikey
✅ 2. Gateway            — resolve app_id from key, fall back to header
✅ 3. Console API routes — CRUD for apps and app-scoped keys
✅ 4. Console UI         — /settings/apps pages + app selector in nav
✅ 5. Explorer filtering — pass app_id to ClickHouse queries when selected
✅ 6. SDK               — appId now optional, watcher.ts uses spread pattern
```

---

## Open Questions

- **Environments**: Should `environment` (production/staging/development) be a property of the
  App or of the API key? Recommendation: the **key** carries the environment — one app can have
  a production key and a staging key, matching how Sentry handles it.

- **App-level settings**: Rate limits, data retention, alert rules — these are per-App settings
  that become possible once the App entity exists. Out of scope for this implementation but
  the schema supports them as future columns on the `apps` table.

- **Default app**: For orgs that never set up formal apps, a `__default__` app could be
  auto-created so old org-scoped keys have something to reference. Keeps dashboards coherent.
