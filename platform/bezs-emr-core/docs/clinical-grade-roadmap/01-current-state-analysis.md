# Current State Analysis — FHIR Server

> Deep-dive inventory of what is implemented, what is partially implemented, and what is absent.

---

## 1. Architecture

### Stack

| Layer | Technology | Status |
|---|---|---|
| Web framework | FastAPI 0.129+ with Uvicorn | ✅ Production-suitable |
| ORM | SQLAlchemy 2.0 async | ✅ Production-suitable |
| Database driver | asyncpg | ✅ |
| Database | PostgreSQL 15 (pg_trgm extension) | ✅ |
| Session cache | Redis 7 (asyncio) | ✅ |
| Auth provider | Keycloak (python-keycloak 7.x) | ✅ partially wired |
| DI framework | dependency-injector 4.48 | ✅ |
| Config | pydantic-settings (.env file) | ⚠️ minimal — only 2 env vars |
| Terminology | Custom service (SNOMED, LOINC, RxNorm, ICD-10-CM) | ✅ operational |
| Python | 3.12 (uv) | ✅ |

### Layered Architecture — As Implemented

```
HTTP Request
    │
    ▼
RateLimitMiddleware          (Redis sliding-window, in-process fallback)
    │
request_context_middleware   (UUID injection → X-Request-ID header)
    │
    ▼
Router                       (FastAPI — input validation, Accept dispatch)
    │
    ▼
Service                      (thin orchestration, FHIR/plain mapper wrappers)
    │
    ▼
Repository                   (all DB I/O, session-per-operation, eager-load)
    │
    ▼
SQLAlchemy ORM Models        (FHIRBase, sequence-based public IDs)
    │
    ▼
PostgreSQL 15
```

**Key strength:** Clean separation, session-per-operation prevents connection leaks, eager loading prevents N+1, dependency-injector keeps wiring explicit.

**Key weakness:** Services are pass-through thin wrappers with zero business logic. The service layer exists architecturally but is empty.

---

## 2. FHIR Resources Implemented

All 34 resources below have full CRUD (POST/GET/PATCH/DELETE), sub-resource endpoints, `/me` route, FHIR + plain JSON dual format, integration tests (most), and DI wiring.

| # | Resource | Router prefix | Tests |
|---|---|---|---|
| 1 | Patient | `/api/fhir/v1/patients` | ✅ comprehensive |
| 2 | Practitioner | `/api/fhir/v1/practitioners` | ✅ |
| 3 | Encounter | `/api/fhir/v1/encounters` | ✅ |
| 4 | Appointment | `/api/fhir/v1/appointments` | ✅ |
| 5 | Condition | `/api/fhir/v1/conditions` | ✅ |
| 6 | Observation | `/api/fhir/v1/observations` | ✅ |
| 7 | DiagnosticReport | `/api/fhir/v1/diagnostic-reports` | ✅ |
| 8 | MedicationRequest | `/api/fhir/v1/medication-requests` | ✅ |
| 9 | Medication | `/api/fhir/v1/medications` | ✅ |
| 10 | Procedure | `/api/fhir/v1/procedures` | ✅ |
| 11 | ServiceRequest | `/api/fhir/v1/service-requests` | ✅ |
| 12 | DeviceRequest | `/api/fhir/v1/device-requests` | ✅ |
| 13 | AllergyIntolerance | `/api/fhir/v1/allergy-intolerances` | ✅ |
| 14 | Immunization | `/api/fhir/v1/immunizations` | ✅ |
| 15 | CarePlan | `/api/fhir/v1/care-plans` | ✅ |
| 16 | Organization | `/api/fhir/v1/organizations` | ✅ |
| 17 | PractitionerRole | `/api/fhir/v1/practitioner-roles` | ✅ |
| 18 | HealthcareService | `/api/fhir/v1/healthcare-services` | ✅ |
| 19 | Location | `/api/fhir/v1/locations` | ✅ |
| 20 | Schedule | `/api/fhir/v1/schedules` | ✅ |
| 21 | Slot | `/api/fhir/v1/slots` | ✅ |
| 22 | QuestionnaireResponse | `/api/fhir/v1/questionnaire-responses` | ✅ |
| 23 | Claim | `/api/fhir/v1/claims` | ✅ |
| 24 | ClaimResponse | `/api/fhir/v1/claim-responses` | ✅ |
| 25 | Coverage | `/api/fhir/v1/coverages` | ✅ |
| 26 | Invoice | `/api/fhir/v1/invoices` | ✅ |
| 27 | Task | `/api/fhir/v1/tasks` | ✅ |
| 28 | AuditEvent | `/api/fhir/v1/audit-events` | ✅ |
| 29 | Provenance | `/api/fhir/v1/provenances` | ✅ |
| 30 | DocumentReference | `/api/fhir/v1/document-references` | ✅ |
| 31 | Specimen | `/api/fhir/v1/specimens` | ✅ |
| 32 | RelatedPerson | `/api/fhir/v1/related-persons` | ✅ |
| 33 | EpisodeOfCare | `/api/fhir/v1/episode-of-cares` | ✅ |
| 34 | Vitals | `/api/v1/vitals` | ✅ |

**Notable extras:**
- Terminology Service at `/api/v1/terminology` — code system search, $expand, $validate-code, $translate, org-scoped custom concepts, governance audit log
- Session manager (Redis-backed Keycloak token storage)
- Terminology data files: SNOMED CT US Edition 2026-03-01, ICD-10-CM 2026, LOINC, RxNorm (RRF) — raw data loaded

---

## 3. Authentication & Authorization — What Exists

### JWT / Keycloak Integration
- `python-keycloak 7.x` and `PyJWT 2.11` are in dependencies
- `app/core/session.py` — full Redis-backed session manager that stores Keycloak tokens
- Session CRUD: create, get, update (refresh), delete (logout)
- `SessionManager` correctly stores access_token, refresh_token, token_type
- Keycloak module exists (`app/core/keycloak.py` referenced in pycache but file not in tree — likely removed/moved)

### Request-Level Auth State
- Routes read `request.state.user.get("sub")` and `request.state.user.get("activeOrganizationId")` — these claims are expected to be set by upstream middleware
- **No middleware in `app/middleware/` reads and validates a JWT** — only `RateLimitMiddleware` and `request_context_middleware` are mounted in `main.py`
- This means JWT validation middleware was removed or is expected to be provided by the Pulse orchestrator layer

### Multi-tenancy
- Every resource row carries `user_id` + `org_id`
- Repositories filter by these on all list/get operations
- `resolve_<resource>()` deps raise 404 if the resource doesn't belong to the requester's org
- **Strength:** basic tenant isolation is consistent across all 34 resources

### What Is NOT Present
- No `GET /api/fhir/v1/.well-known/smart-configuration` endpoint
- No `scope` claim extraction or enforcement (SMART v2 granular scopes)
- No RBAC middleware (role → resource → action matrix)
- No ABAC policies (care-team membership, sensitivity labels)
- No resource-level permission check beyond org/user ownership
- No `Consent` resource enforcement
- No break-glass access pattern
- No `require_permission()` function despite CLAUDE.md mentioning it

---

## 4. Middleware Stack — What Exists

### Present
| Middleware | What it does |
|---|---|
| `RateLimitMiddleware` | Redis sliding-window per-user (100 reads/60s, 20 writes/60s), in-process fallback |
| `request_context_middleware` | UUID `X-Request-ID`, injects to contextvar for logger |

### Absent (Critical)
| Missing | Why Critical |
|---|---|
| JWT validation middleware | Without it, any call passes auth if upstream strips it |
| CORS middleware | Browser clients blocked or misconfigured |
| TLS termination config | No HTTPS enforcement at app level |
| AuditEvent auto-emission middleware | HIPAA requires every PHI access to be logged |
| Security headers middleware | No `Strict-Transport-Security`, `X-Content-Type-Options`, etc. |
| Request size limiting | Large payload DoS vector |

---

## 5. Terminology Service

This is a significant existing asset:

- SNOMED CT US Edition 2026-03-01 (full snapshot including concepts, descriptions, relationships)
- ICD-10-CM 2026 codes
- LOINC table (LoincTableCore.csv)
- RxNorm full RRF (RXNCONSO, RXNREL, RXNSAT, etc.)
- FHIR R4 profiles-resources.json, profiles-types.json, valuesets.json, v3-codesystems.json

**Operational endpoints:**
- `GET /code-systems` — list loaded code systems
- `GET /value-sets` — paginated, keyword-searchable
- `GET /value-sets/{id}/expand` — paginated expansion with full-text search
- `GET /search` — trigram similarity search across all concepts
- `POST /lookup`, `POST /lookup-batch` — code lookup by system+code
- `GET /concepts?resource=X&field=Y` — value set for a FHIR field binding
- `POST /validate` — validate system+code against field binding (respects required/extensible/preferred)
- `POST /translate` — cross-system concept translation
- Org-scoped custom concepts with governance audit log

**Gap:** Standard FHIR terminology operations ($expand, $validate-code, $lookup, $translate) are not exposed under the FHIR namespace (`/api/fhir/v1/`). They are at `/api/v1/terminology` with a non-FHIR contract. FHIR clients will expect operations like `GET /CodeSystem/$lookup`, `GET /ValueSet/$expand`.

---

## 6. Logging & Observability

### Present
- `app/core/logging.py` — custom `JsonFormatter` emitting structured JSON to stdout
- Every log record includes `timestamp`, `level`, `logger`, `message`, `request_id`
- Exception tracebacks captured in `traceback` field
- Error handlers log method, path, query params, client IP at appropriate levels

### Absent
| Missing | Importance |
|---|---|
| OpenTelemetry instrumentation | Distributed tracing across services |
| Prometheus metrics endpoint (`/metrics`) | RED metrics for SRE |
| AuditEvent middleware writing to DB | HIPAA PHI access logging |
| SIEM integration | Anomaly detection, security monitoring |
| Alerting on error rates | Operational visibility |

The comment block at the bottom of `main.py` confirms the developer planned these:
```python
# observability
# deterministic execution
# auditability
# retries
# tracing
# idempotency
# failure recovery
```

---

## 7. Error Handling

**Strength:** All errors return FHIR-compliant `OperationOutcome` with proper `issue` arrays. Handlers for `ApplicationError`, `RequestValidationError`, `ResponseValidationError`, `HTTPException`, and catch-all `Exception`. `X-Request-ID` header on all responses.

**Gap:** `ApplicationError` hierarchy exists (`base.py`, `domain.py`, `infrastructure.py`) but domain errors are generic. There are no domain-specific typed errors for clinical scenarios (e.g., `SlotAlreadyBookedError`, `PatientConsentRequiredError`, `MedicationConflictError`).

---

## 8. Database & Migrations

- Alembic present (referenced in dependencies)
- `Database` class with async session factory, `create_extensions()` for pg_trgm
- All ORM models use `declarative_base()` (`FHIRBase`)
- Public IDs via PostgreSQL sequences starting at resource-specific ranges (10000, 20000, …)
- Internal `id` PK never exposed

**Gap:** No connection pooling configuration visible in `Database.__init__` — `create_async_engine` uses SQLAlchemy defaults (pool size 5, max_overflow 10). For production, `pool_size`, `max_overflow`, `pool_pre_ping`, and `pool_recycle` must be explicitly configured.

---

## 9. FHIR Conformance

### Present
- FHIR R4 resource structure for 34 resources
- Dual-format output (FHIR camelCase / plain snake_case)
- FHIR Bundle for list responses (`searchset`)
- FHIR OperationOutcome for errors
- `resourceType` field on all FHIR responses
- Reference encoding (`Patient/10001` format)
- Basic pagination (`total`, `limit`, `offset`, Bundle `entry[]`)

### Absent (FHIR Spec Failures)
| Missing | FHIR Requirement Level |
|---|---|
| `GET /metadata` CapabilityStatement | **Required by spec** — first Inferno test |
| `_include` / `_revinclude` search parameters | P0 interoperability |
| Chained search (`Observation?subject.name=`) | P1 |
| `_has` (reverse chained) | P1 |
| Search parameter modifiers (`:exact`, `:missing`, `:above`, `:below`) | P1 |
| `_sort`, `_elements`, `_summary` | P1 |
| `_history` (resource versioning) | P1 — medico-legal |
| `vread` (`GET /{id}/_history/{vid}`) | P1 |
| `Patient/$everything` compartment operation | P1 — US Core required |
| `$validate` operation | P1 |
| Transaction / batch Bundle (`POST /`) | P1 |
| SMART on FHIR `.well-known/smart-configuration` | P0 |
| US Core profile conformance enforcement | P1 — ONC |
| Conditional create/update/delete | P2 |
| Bulk Data `$export` | P1 — ONC (g)(10) |

---

## 10. Security Configuration

### Present
- Rate limiting with Redis (production-grade sliding window)
- Multi-tenancy via `user_id` + `org_id` on every row
- Pydantic `extra="forbid"` on all schemas (prevents mass-assignment injection)
- Session tokens stored in Redis (never sent raw to client)

### Absent
| Missing | Severity |
|---|---|
| TLS/HTTPS enforcement | P0 — HIPAA |
| AES-256 encryption at rest | P0 — HIPAA |
| JWT validation middleware in FastAPI | P0 — currently JWT is assumed to be validated upstream |
| SMART scope enforcement | P0 |
| Security headers (HSTS, CSP, X-Frame, XCTO) | P1 |
| `secrets_manager` integration | P1 — bare `.env` file is a credential leak risk |
| SQL injection protection (parameterized queries review) | P1 — SQLAlchemy ORM is safe but raw text() queries need auditing |
| Input sanitization for free-text fields | P1 |
| Audit trail for admin operations | P1 |

---

## 11. Testing

### Present
- `pytest-asyncio` + `httpx` integration tests
- Tests for most resources covering CRUD, sub-resources, and some edge cases
- `aiosqlite` as test database (allows in-process test runs)
- Test helpers (`tests/helpers/assertions.py`)
- Per-resource `conftest.py` and `support.py`

### Absent
- No unit tests for service/repository logic
- No FHIR conformance tests (Inferno-style)
- No performance/load tests (k6)
- No security tests
- No contract tests for the OpenAPI spec / MCP integration
- No test coverage measurement

---

## 12. Infrastructure

### Present
- Health check (`/health`) and readiness check (`/health/ready`) — checks DB + Redis
- `uv` for package management

### Absent
- No `Dockerfile`
- No `docker-compose.yml`
- No Kubernetes manifests
- No CI/CD pipeline
- No backup configuration
- No secrets management (Vault, AWS Secrets Manager)
- No environment-specific config (dev/staging/prod profiles)
- No observability stack (Prometheus, Grafana, Jaeger)
