# Phase 1 — Security Foundation (Weeks 1–8)

**Goal:** Make the server safe for production use with real patient data.  
**End state:** HIPAA-compliant data access with audit trail, versioning, and auth.

---

## Deliverables

### Week 1-2 — Resource Versioning

| Task | File | Effort |
|---|---|---|
| Add `version_id` column migration for all resource tables | Alembic migration | 1 day |
| Create `resource_history` universal table | Alembic migration | 0.5 day |
| `HistoryRepository` — record on every create/update/delete | `app/repository/history_repository.py` | 2 days |
| `GET /{resource}/{id}/_history` router | `app/routers/history.py` | 1 day |
| `GET /{resource}/{id}/_history/{vid}` — specific version | same file | 0.5 day |
| `ETag` + `Last-Modified` response headers on all GETs | `app/core/content_negotiation.py` | 1 day |
| `If-Match` conditional update enforcement | `app/routers/*.py` | 1 day |
| `If-None-Match: *` conditional create | same | 0.5 day |

**Exit criteria:** `GET /Patient/10001/_history` returns 3+ entries after create + 2 updates.

---

### Week 3-4 — Audit Logging

| Task | File | Effort |
|---|---|---|
| `phi_access_log` table migration | Alembic | 0.5 day |
| `AuditMiddleware` — auto-write on every PHI request | `app/audit/middleware.py` | 2 days |
| Checksum computation for tamper-evidence | same | 1 day |
| Auto-write to `AuditEvent` FHIR resource | `app/services/audit_service.py` | 1 day |
| `GET /AuditEvent?agent=...` query | update existing router | 1 day |
| Breach detection background scanner | `app/audit/breach_detector.py` | 2 days |

**Exit criteria:** Every GET/POST/PUT/DELETE on Patient writes a `phi_access_log` row.

---

### Week 5-6 — `$validate` Operation

| Task | File | Effort |
|---|---|---|
| Base R4 validation engine | `app/services/validation_service.py` | 3 days |
| `POST /{resource}/$validate` router | `app/routers/operations/validate.py` | 1 day |
| `OperationOutcome` response formatting | `app/errors/operation_outcome.py` | 1 day |
| Required field validation per resource type | same | 2 days |

**Exit criteria:** `POST /Patient/$validate` with missing `resourceType` returns error outcome.

---

### Week 7-8 — CapabilityStatement + Security

| Task | File | Effort |
|---|---|---|
| `GET /metadata` CapabilityStatement endpoint | `app/routers/metadata.py` | 2 days |
| Advertise supported resources, operations, search params | same | 1 day |
| Security headers middleware | `app/core/security_headers.py` | 0.5 day |
| Rate limiting (slowapi) | `app/core/rate_limiting.py` | 1 day |
| HTTPS enforcement middleware | `app/core/middleware.py` | 0.5 day |
| `/.well-known/smart-configuration` discovery stub | `app/routers/well_known.py` | 0.5 day |

**Exit criteria:** `GET /metadata` returns valid CapabilityStatement. All responses have security headers.

---

## OAuth2 / SMART on FHIR — Parallel Track

OAuth2 is complex enough to run as a parallel track across Phases 1 and 2.

| Week | OAuth2 Task |
|---|---|
| 1-2 | Database schema (oauth_clients, auth_codes, refresh_tokens) |
| 3-4 | JWT key management, `/oauth2/token` client_credentials flow |
| 5-6 | Authorization code + PKCE flow |
| 7-8 | SMART launch tokens, EHR launch handler |

---

## Definition of Done — Phase 1

- [ ] `GET /_history` works for all resource types
- [ ] Every mutation writes audit log row
- [ ] `POST /$validate` returns OperationOutcome
- [ ] `GET /metadata` returns CapabilityStatement
- [ ] All responses include `ETag`, security headers
- [ ] `If-Match` conflict returns 409
- [ ] Rate limits enforce 100 req/min per org
- [ ] All tests pass (new tests added for all above)

---

## Metrics to Track

- Audit log write latency (must be < 5ms async)
- History table size growth
- Validation operation accuracy (test against known valid/invalid resources)
