# Resource Versioning & Conditional Operations

FHIR R4 requires every resource to support version history via the `_history` API.  
This is not optional — it's part of the base spec and expected by EHR integrations.

---

## Files in This Section

| File | Topic |
|---|---|
| [01-version-history.md](./01-version-history.md) | `_history` endpoint, `meta.versionId`, ETag support |
| [02-conditional-operations.md](./02-conditional-operations.md) | `If-Match`, `If-None-Match`, conditional create/update/delete |

---

## Current State

We store `created_at` and `updated_at` on every resource but:
- No version ID tracking
- No historical versions kept
- No `ETag` headers
- No conditional requests
- `GET /{resource}/{id}/_history` does not exist

---

## Why This Matters

1. **FHIR compliance** — `_history` is a SHALL requirement in R4
2. **Audit trail** — clinical data must be auditable; who changed what when
3. **Optimistic concurrency** — `If-Match` prevents two clinicians overwriting each other
4. **Data recovery** — ability to view and restore previous versions
5. **Subscription backfill** — `$events` uses history to replay missed events
