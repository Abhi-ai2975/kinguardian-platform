# IAM — Internal API Reference

Internal endpoints are called **server-to-server only** (console → IAM, gateway → IAM).
They are never exposed to end-users or browsers.

## Authentication

All internal endpoints require the `x-internal-secret` header:

```
x-internal-secret: <INTERNAL_API_SECRET env var>
```

If the secret is missing or wrong, the endpoint returns `401 Unauthorized`.

When `INTERNAL_API_SECRET` is not set (local dev shortcut), the check is skipped.
**Never run without a secret in staging or production.**

---

## Public Token Management

Public tokens (`wpub_` prefix) are browser-safe API keys with origin allowlists and
per-minute rate limits. They are created by the console on behalf of the authenticated
user's active organisation and validated by the gateway on each inbound request.

The raw token is returned **once on creation** and never stored — only the SHA-256
hash is persisted (same scheme as better-auth secret keys).

### GET /api/internal/public-tokens?orgId=xxx

List all public tokens for an organisation. Never returns the raw token value.

**Query parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `orgId` | Yes | Organisation ID (`organization.id`) |

**Response (200):**

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

`appId` is the linked Application ID (`application.id`). `null` when the token is org-level (no app linked).

---

### POST /api/internal/public-tokens

Create a new public token for an organisation.

**Request body:**

```json
{
  "orgId": "org_...",
  "name": "my-app-browser",
  "allowedOrigins": ["https://myapp.com", "https://staging.myapp.com"],
  "minuteRateLimit": 1000,
  "appId": "50d1064f-1f69-4b12-b61d-afb78e1a8d38"
}
```

| Field | Required | Constraints |
|-------|----------|-------------|
| `orgId` | Yes | Must match an existing organisation |
| `name` | Yes | Non-empty string |
| `allowedOrigins` | Yes | Non-empty array, max 10 entries. Each must start with `https://` or `http://localhost` |
| `minuteRateLimit` | No | Positive integer, max 10 000. Defaults to 1 000 |
| `appId` | No | Application ID to link the token to. Must belong to `orgId`. When set, the gateway tags all browser events from this token with `application_id` — same app as the server-side key so both appear together in the dashboard. |

**Response (201):**

```json
{
  "token": "wpub_<base64url-random>",
  "id": "abc123",
  "name": "my-app-browser",
  "start": "wpub_xy",
  "allowedOrigins": ["https://myapp.com"],
  "minuteRateLimit": 1000,
  "appId": "50d1064f-1f69-4b12-b61d-afb78e1a8d38",
  "createdAt": "2026-05-27T10:00:00Z"
}
```

`appId` is `null` in the response when no app was linked.

The `token` field is the raw key — it appears **only in this response**. The caller must
present it to the user immediately; it cannot be retrieved again.

**Error responses:**

| Status | Meaning |
|--------|---------|
| 400 | `orgId`, `name`, or `allowedOrigins` missing or invalid |
| 403 | Plan limit reached — org is at the maximum number of public tokens for their plan (free: 2, pro: 10, enterprise: unlimited) |
| 404 | Organisation not found, or `appId` provided but not found / does not belong to this org |

---

### DELETE /api/internal/public-tokens?id=xxx

Revoke (permanently delete) a public token by its DB id.

**Query parameters:**

| Param | Required | Description |
|-------|----------|-------------|
| `id` | Yes | Token DB id (`apikey.id`) |

The endpoint verifies `keyType = "public"` before deleting. It will not delete secret API keys.

**Response (200):**

```json
{ "ok": true }
```

**Error responses:**

| Status | Meaning |
|--------|---------|
| 400 | `id` query param missing |

---

## Organisation Activation

### POST /api/internal/organization/set-active

Atomically sets the user's active organisation in **both** the better-auth session
(browser cookie) **and** the `userContext` table (gateway key resolution).

Calling only `better-auth /set-active` leaves `userContext.activeOrganizationId`
as NULL, causing the gateway to publish API-key events to the wrong Redis channel
and breaking the live feed and dashboard charts for server-side SDK keys.

**Auth:** User session — forward the caller's `cookie` and/or `Authorization: Bearer`
headers. This endpoint acts on behalf of the authenticated user, not as a service
secret.

**Request body:**

```json
{ "organizationId": "org_abc123" }
```

**Response (200):**

```json
{ "organizationId": "org_abc123" }
```

The response also forwards any `Set-Cookie` headers from better-auth so the
console can relay them to the browser.

**Error responses:**

| Status | Meaning |
|--------|---------|
| 400 | `organizationId` missing |
| 401 | No valid session or Bearer token |
| 403 | User is not a member of the requested organisation |
| 404 | Token not found or is not a public token |

---

## Dashboards

Dashboards are org-scoped, user-created layouts. Each dashboard stores a
`layout` JSON array (react-grid-layout descriptor) containing widget
position/size and configuration.

All endpoints: auth via user session cookie or `Authorization: Bearer` token.

### GET /api/internal/dashboards?orgId=xxx

List all dashboards for an org. Returns metadata only (no `layout`).

**Response (200):**
```json
{ "dashboards": [{ "id", "name", "description", "userId", "createdAt", "updatedAt" }] }
```

### POST /api/internal/dashboards

Create a new empty dashboard.

**Body:** `{ "orgId": "...", "name": "...", "description"?: "..." }`

**Response (201):** `{ "dashboard": { ...full object... } }`

### GET /api/internal/dashboards/[id]

Fetch one dashboard including its full `layout` array.

**Response (200):** `{ "dashboard": { ...full object including layout... } }`

### PUT /api/internal/dashboards/[id]

Update name, description, or layout. Send only the fields to change.

**Body:** `{ "name"?: "...", "description"?: "...", "layout"?: [...] }`

**Response (200):** `{ "dashboard": { ...updated... } }`

### DELETE /api/internal/dashboards/[id]

Delete a dashboard. Only the creator or an org admin/owner may delete.

**Response (200):** `{ "ok": true }`

---

## Plan-Based Resource Limits

IAM enforces per-plan resource quotas at the better-auth hook layer. When a limit is exceeded the relevant endpoint returns an error before the resource is created.

| Resource | Enforcement point | Free | Pro | Enterprise |
|----------|------------------|------|-----|------------|
| Organisations per user | `allowUserToCreateOrganization` hook | 1 | 5 | Unlimited |
| Teams per org | `hooks.before /organization/create-team` | 1 | 10 | Unlimited |
| Members per team | `hooks.before /organization/add-team-member` | 3 | 20 | Unlimited |
| Secret API keys per org | `hooks.before /api-key/create` | 2 | 20 | Unlimited |
| Public tokens per org | `POST /api/internal/public-tokens` | 2 | 10 | Unlimited |
| Applications per org | `POST /api/apps` | 2 | 10 | Unlimited |

Limits are read from `src/modules/server/auth-provider/plan-limits.ts` — the single source of truth. The org's plan is resolved by querying the `subscription` table for an active/trialing subscription; orgs with no subscription default to the free tier.

All limit errors return HTTP **403** with a human-readable message explaining the limit and that upgrading will raise it.

---

## Data Retention

### GET /api/internal/orgs/retention

Returns every organisation's retention window based on their active subscription plan.
Called nightly by the `analytics-python` retention scheduler.

**Auth:** `x-internal-secret` header (machine-to-machine, not user session).

**Plan → retention days mapping:**

| Plan | Retention |
|------|-----------|
| `enterprise` | 365 days |
| `pro` | 90 days |
| `free` (default) | 7 days |

When an org has no active subscription, it defaults to `free` (7 days).
When an org has multiple active subscriptions (edge case), the highest tier wins.

**Response (200):**

```json
{
  "orgs": [
    { "orgId": "org_abc", "plan": "pro",        "retentionDays": 90  },
    { "orgId": "org_xyz", "plan": "free",       "retentionDays": 7   },
    { "orgId": "org_ent", "plan": "enterprise", "retentionDays": 365 }
  ]
}
```

**Error responses:**

| Status | Meaning |
|--------|---------|
| 401 | Missing or wrong `x-internal-secret` |
