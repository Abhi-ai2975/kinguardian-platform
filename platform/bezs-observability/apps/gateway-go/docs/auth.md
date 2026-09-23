# Gateway — Authentication

## How API Key Validation Works

API keys are created and managed by the IAM service (better-auth apiKey plugin).
The gateway validates them by querying the IAM's PostgreSQL database directly.

---

## Key Storage

Better-auth stores API keys **hashed** in the `apikey` table of the `iam` database.

```
apikey table (iam database)
  id            — unique key ID
  key           — SHA-256 hash of the raw key
  prefix        — visible prefix for display (e.g. "wtch_")
  start         — first few chars of the raw key (for display: "wtch_abc1...")
  referenceId   — the organization ID this key belongs to
  enabled       — true/false
  expiresAt     — nullable, UTC
  rateLimitMax  — max requests per window
  permissions   — JSON string of allowed permissions (nullable = all)
```

The raw key is **never stored**. Only the SHA-256 hash is persisted.

---

## Validation Flow

```
1. Extract raw key from request
     Authorization: Bearer wtch_abc123...
     or X-API-Key: wtch_abc123...

2. SHA-256 hash the raw key

3. Query IAM database:
     SELECT id, reference_id, enabled, expires_at, permissions
     FROM apikey
     WHERE key = $1

4. Check enabled = true

5. Check expires_at IS NULL OR expires_at > NOW()

6. Return APIKey domain object with organization_id = referenceId
```

---

## Where Organization ID Comes From

The `referenceId` column in the `apikey` table is set by the IAM when the key is created.
For Watcher24, keys are always scoped to an organization — `referenceId` = `organization.id`.

The gateway puts `organization_id` into the Fiber request locals so handlers can access it:

```go
// In middleware/auth.go
c.Locals("organization_id", apiKey.OrganizationID)
c.Locals("api_key_id", apiKey.ID)
```

---

## Security Notes

- The gateway connects to the IAM database as a **read-only** user in production
- Key lookups are indexed on the `key` column (SHA-256 hash) — fast O(1) lookup
- The raw key is never logged anywhere
- Key validation result is **not cached** in MVP — every request hits the DB
  (add Redis caching in Phase 2 for high throughput)
