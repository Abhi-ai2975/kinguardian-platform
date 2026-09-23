# Multi-App Support

## What is an App?

An **App** is a registered instrumented target inside an organisation — a web frontend,
mobile app, backend API, background worker, AI agent, etc. Each app gets its own API
keys, and every event ingested through those keys is tagged with that app's ID.

```
Organisation
 ├── App: payments-api      → Key: wtch_abc...  (production)
 │                          → Key: wtch_abd...  (staging)
 ├── App: checkout-web      → Key: wtch_xyz...
 └── App: mobile-ios        → Key: wtch_mno...
```

## Managing Apps

Apps are managed at **Settings → Apps** in the console.

| Action | How |
|--------|-----|
| Create app | Enter a name → slug is auto-generated → click Create |
| View app ID | Shown under each app row — click to copy |
| Link a key | Click the app → select a key from the dropdown → Link |
| Unlink a key | Click the trash icon next to a linked key |
| Delete app | Click the trash icon on the app list — linked keys are unlinked, not deleted |

## App Switcher

The top nav contains an **App Switcher** dropdown. Selecting an app sets a `watcher_app`
cookie. All explorer pages (Audit, Logs, Traces, Metrics) read this cookie server-side
and add an `application_id` filter to their ClickHouse queries. Selecting **All Apps**
clears the cookie and shows events from every app.

## How `application_id` Is Resolved on Ingest

The gateway resolves `application_id` from **one source only** — the `app_id` column on
the `apikey` row, which is set when you link a key to an app in the console.

Any `appId` value in the SDK config or request body is **always ignored**.

### Key linked to an app ✅

When a key is linked to an app, the `apikey.app_id` column is set to that app's UUID.
Every event sent with that key is tagged with the linked app's ID automatically.

```
Key linked to: payments-api (50d1064f-...)
SDK config:    appId: "anything"   ← ignored
Stored as:     application_id = "50d1064f-..."
```

### Key NOT linked to any app

`application_id` is stored as `""`. The SDK `appId` is ignored entirely — there is no
fallback. Events will only appear under **All Apps** in the console.

```
Key linked to: nothing
SDK config:    appId: "50d1064f-..."   ← ignored
Stored as:     application_id = ""
Console view:  shows in "All Apps" only
```

### Summary

| Key linked to app? | SDK `appId` | `application_id` stored | App filter works? |
|--------------------|-------------|------------------------|-------------------|
| ✅ Yes | anything | key's app UUID | ✅ Yes |
| ❌ No | anything | `""` (empty) | ❌ No |

> 💡 **Bottom line**: link your API key to an app in the console. That is the only way
> events are tagged with an `application_id` and appear in per-app filtered views.

## Database

Apps are stored in the `applications` table in the IAM PostgreSQL database. The console
manages them by calling the IAM service's HTTP API (`/api/apps/*`) — it does not
connect to the database directly. IAM uses Prisma to query the table.

```sql
-- applications table (created by migration 001_init.sql)
CREATE TABLE applications (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  organization_id TEXT NOT NULL,
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, slug)
);

-- app_id column on apikey (added by migration 002_app_api_key_scope.sql)
ALTER TABLE apikey ADD COLUMN app_id TEXT REFERENCES applications(id) ON DELETE SET NULL;
```

`ON DELETE SET NULL` means deleting an app unlinks its keys — it does not delete them.
