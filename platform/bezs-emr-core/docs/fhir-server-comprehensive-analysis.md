# FHIR Server — Comprehensive Analysis & Improvement Roadmap

**Status:** Deep-Dive Technical Assessment
**Date:** 2026-05-30
**Author:** AI Code Agent (Plan Mode Analysis)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Identity & Scope](#2-project-identity--scope)
3. [Technical Architecture](#3-technical-architecture)
4. [Resource Implementation Status](#4-resource-implementation-status)
5. [Terminology System](#5-terminology-system)
6. [Security & Authorization](#6-security--authorization)
7. [Testing & Quality](#7-testing--quality)
8. [Operational Maturity](#8-operational-maturity)
9. [What's Missing — Feature Gap Analysis](#9-whats-missing--feature-gap-analysis)
10. [Non-Feature Improvements](#10-non-feature-improvements)
11. [The Business Logic Server Layer](#11-the-business-logic-server-layer)
12. [Implementation Roadmap](#12-implementation-roadmap)

---

## 1. Executive Summary

This is a **FHIR R4-compliant REST API** built with FastAPI + PostgreSQL, serving **34 healthcare resources** with full content negotiation (FHIR JSON + plain JSON). It uses a strict 4-layer architecture applied uniformly across all resources.

**Overall Assessment:** The architecture foundation is **solid and well-structured** — the layered pattern, DI container, content negotiation, terminology system, and code conventions are consistent and well-executed. However, there are critical security gaps (object-level authorization is unsafe), operational maturity is low (no CI/CD, no metrics, no caching), and there's a clear need for a Business Logic Server layer above this data-tier API.

**The Two-Server Vision:**
```
Business Logic Server (auth, workflow, notifications, cron, integrations)
                        ↓ FHIR REST API calls
FHIR Server (data layer — what we have now)
                        ↓ SQL
PostgreSQL + Redis
```

This FHIR Server should be the **bottom data layer**. A separate Business Logic Server sits on top, consumes FHIR APIs, and handles all the product-specific business logic.

---

## 2. Project Identity & Scope

| Attribute | Value |
|-----------|-------|
| **Stack** | FastAPI 0.129+ + Uvicorn, PostgreSQL 15 (asyncpg), SQLAlchemy 2.0 async, Redis 7, dependency-injector |
| **Auth** | JWT via PyJWKClient (JWKS endpoint), Keycloak integration |
| **Python** | 3.12+ |
| **Package Manager** | uv |
| **Resources Served** | 34 FHIR R4 resources + Vitals (custom flat resource) |
| **Format** | `application/fhir+json` (FHIR R4) or `application/json` (plain snake_case) |
| **Terminology** | SNOMED CT, LOINC, ICD-10-CM, RxNorm, FHIR R4 built-ins |

### What This Server Is
- A **pure data API** — CRUD operations on FHIR resources with terminology validation
- **Multi-tenant** — org_id scoping on every resource
- **Content-negotiating** — same endpoint returns FHIR or plain JSON based on Accept header
- **Strictly layered** — Router → Service → Repository → ORM Model, never skipped

### What This Server Is NOT
- A workflow engine
- A notification system
- An authorization server (RBAC is defined but not enforced)
- A reporting/analytics platform
- A clinical decision support system
- An HL7 v2/v3 integration hub

These belong in the Business Logic Server layer above it.

---

## 3. Technical Architecture

### 3.1 The 4-Layer Architecture

```
Router (FastAPI endpoint)
  ├── Auth Dependencies (JWT validation, permission check)
  ├── Resource Resolver (public ID → ORM model, or 404)
  └── Calls Service
        └── Service (thin delegation)
              ├── _to_fhir(model) → FHIR JSON via mapper
              ├── _to_plain(model) → snake_case via mapper
              └── Calls Repository
                    └── Repository (all SQL)
                          ├── async with session_factory()
                          ├── select(...) with selectinload relationships
                          └── Returns ORM Model
```

**Key rules enforced everywhere:**
- Routers NEVER call repositories directly
- Repositories own ALL database I/O (session-per-operation pattern)
- Services are thin wrappers — they delegate then transform via mappers
- ORM models have internal `id` (PK) + public `{resource}_id` (sequence-based, exposed)

### 3.2 Content Negotiation

Every endpoint returns either format based on the `Accept` header:

| Header | Response Format | Example |
|--------|----------------|---------|
| `application/fhir+json` | FHIR R4 JSON | `{"resourceType":"Patient","name":[{"family":"Doe"}],...}` |
| `application/json` (default) | snake_case flat JSON | `{"patient_id":10001,"family_name":"Doe",...}` |

Implemented via `app/core/content_negotiation.py`:
- `wants_fhir(request)` → checks Accept header
- `format_response(fhir_data, plain_data, request)` → returns appropriate JSONResponse
- `format_paginated_response(fhir_list, plain_list, total, limit, offset, request)` → FHIR Bundle or `{total, limit, offset, data}`

### 3.3 Public ID System

Every resource has two IDs:
- **Internal `id`**: Auto-increment PostgreSQL PK, never exposed
- **Public `{resource}_id`**: Sequence-based, starts at a resource-specific base

| Resource | Public ID Field | Sequence Start |
|----------|----------------|----------------|
| Patient | `patient_id` | 10000 |
| Encounter | `encounter_id` | 20000 |
| Practitioner | `practitioner_id` | 30000 |
| Appointment | `appointment_id` | 40000 |
| QuestionnaireResponse | `questionnaire_response_id` | 60000 |
| Vitals | `vitals_id` | 70000 |
| AllergyIntolerance | `allergy_intolerance_id` | 80000 |
| CarePlan | `care_plan_id` | 90000 |
| Condition | `condition_id` | 120000 |
| Observation | `observation_id` | 140000 |
| ... (and 23 more resources with allocated ranges) | | |

### 3.4 CodeableConcept Storage Pattern

Complex FHIR types are NOT stored as JSONB. They are **flattened into columns** on child tables for SQL queryability:

```sql
-- Instead of: data JSONB '{"coding":[{"system":"...","code":"...","display":"..."}]}'
-- We store:
condition_code_system  VARCHAR
condition_code_code    VARCHAR
condition_code_display VARCHAR
condition_code_text    VARCHAR
```

**Multi-valued CodeableConcepts** (0..*) use separate child tables:
```
condition_category      (coding_system, coding_code, coding_display, text)
condition_body_site     (coding_system, coding_code, coding_display, text)
```

**References** (0..1) use:
```
subject_type   ENUM('Patient','Practitioner',...)
subject_id     INTEGER            -- public ID of the referenced resource
subject_display VARCHAR
```

### 3.5 Sub-Resource Endpoint Pattern

Resources with complex nested data expose sub-resource endpoints:

```
POST   /patients/{id}/names         — Add a name
PATCH  /patients/{id}/names/{name_id} — Update a name
DELETE /patients/{id}/names/{name_id} — Remove a name
```

This applies to identifiers, telecoms, addresses, photos, contacts, communications, etc.

### 3.6 Dependency Injection

**Framework:** `dependency-injector`

```
Container (root)
├── CoreContainer → Database singleton
├── PatientContainer → PatientRepository + PatientService
├── PractitionerContainer → ...
├── ... (34 resource containers, identical pattern)
└── TerminologyContainer → TerminologyRepository + TerminologyService
```

Each resource has:
- `app/di/modules/{resource}.py` — container definition
- `app/di/dependencies/{resource}.py` — FastAPI `Depends()` bridge

### 3.7 Error Handling

All errors render as **FHIR OperationOutcome**:
```json
{
  "resourceType": "OperationOutcome",
  "issue": [{
    "severity": "error",
    "code": "invalid",
    "diagnostics": "Human-readable error message",
    "expression": ["field.path"]
  }]
}
```

HTTP status → FHIR issue code mapping:
- 400 → `invalid`
- 401 → `security`
- 403 → `forbidden`
- 404 → `not-found`
- 409 → `conflict`
- 422 → `processing`
- 500 → `exception`

Domain exception hierarchy in `app/errors/`:
- `ApplicationError` (base)
  - `AuthenticationError`, `InvalidTokenError` (401)
  - `PermissionDeniedError` (403)
  - `InputValidationError` (400, with per-field `expression`)
  - `BusinessRuleViolationError` (422)
  - `ResourceConflictError` (409)
  - `InfrastructureError` (500, non-operational)
  - `DatabaseError` (500)

### 3.8 OpenAPI Pattern

**No `response_model=` on routes.** Instead, `responses=` dicts with `inline_schema()`:
```python
_SINGLE_200 = {200: {"content": {
    "application/json":      {"schema": inline_schema(PlainPatientResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIRPatientSchema.model_json_schema())},
}}}
```

`inline_schema()` resolves all `$ref`/`$defs` so OpenAPI spec has no dangling references — critical because a FastMCP server consumes this spec to expose endpoints as AI tools.

### 3.9 Pagination

All list endpoints return:
```json
{
  "total": 150,
  "limit": 50,
  "offset": 0,
  "data": [...]
}
```

FHIR format wraps this as a `Bundle` with `type: "searchset"`.

---

## 4. Resource Implementation Status

### 4.1 Fully FHIR-Compliant Resources (33 resources)

These have all 8 required layers: Model, Repository, Service, Router, FHIR Mapper (fhir.py + plain.py), FHIR Schemas, Auth Deps, DI Wiring.

| Resource | Model Complexity | Sub-Resource Tables | Key Notes |
|----------|-----------------|---------------------|-----------|
| **Patient** | 386 lines | 13 | Most complex: names, identifiers, telecoms, addresses, photos, contacts, communications, GP, links |
| **Practitioner** | 235 lines | 7 | Names, identifiers, telecoms, addresses, photos, qualifications, communications |
| **Encounter** | 710 lines | 26 | Most comprehensive model. R5-flavored: businessStatus[], class[] as CodeableConcept, planned dates, virtualService[] |
| **Appointment** | 563 lines | 15 | R5-flavored: replaces[], recurrence template, notes as Annotation[], patientInstruction[], cancellationDate |
| **QuestionnaireResponse** | 257 lines | 5 | Recursive item/answer model. value[x] supports 9 types. basedOn/partOf sub-tables |
| **Immunization** | 432 lines | 10 | Identifier, performer, note, reasonCode, reasonReference, education, programEligibility, reaction, protocolApplied→targetDisease |
| **Organization** | 269 lines | 7 | Identifier, type, alias, telecom, address, contact→telecom grandchild, endpoint |
| **Procedure** | 584 lines | 14 | performed[x] 5 variants, focalDevice, usedReference, usedCode, Annotation notes with author[x] |
| **Schedule** | 167 lines | 5 | Identifier, serviceCategory, serviceType, specialty, actor[] |
| **Task** | 481 lines | 9 | Input/Output with value[x] 8 types, restriction with repetitions+period+recipient[], for_ column |
| **Condition** | ✓ | ✓ | clinicalStatus, verificationStatus, severity, code, category[], bodySite[], stage, evidence |
| **Observation** | ✓ | ✓ | code, category[], interpretation[], bodySite, method, component[], dataAbsentReason |
| **AllergyIntolerance** | ✓ | ✓ | clinicalStatus, verificationStatus, code, category[], reaction[].manifestation[], exposureRoute, substance |
| **MedicationRequest** | ✓ | ✓ | statusReason, medication, category[], dosageInstruction[].site/route/method, reasonCode[] |
| **ServiceRequest** | ✓ | ✓ | code, category[], bodySite[], performerType, reasonCode[], orderDetail[], locationCode[] |
| **DiagnosticReport** | ✓ | ✓ | code, category[], conclusionCode[] |
| **Medication** | ✓ | ✓ | code, form |
| **PractitionerRole** | ✓ | ✓ | code[], specialty[] |
| **HealthcareService** | ✓ | ✓ | category[], type[], specialty[] |
| **CarePlan** | ✓ | ✓ | Activity backbone, addresses[], goal[] |
| **Claim** | ✓ | ✓ | Patient, provider, diagnosis[], insurance[], item[], total |
| **ClaimResponse** | ✓ | ✓ | Outcome, item adjudication, payment |
| **DeviceRequest** | ✓ | ✓ | code[x], reason, performer |
| **DocumentReference** | ✓ | ✓ | content[].attachment, context |
| **EpisodeOfCare** | ✓ | ✓ | statusHistory[], diagnosis[], team[] |
| **Location** | ✓ | ✓ | position, hoursOfOperation[] |
| **Provenance** | ✓ | ✓ | target[], agent[], entity[] |
| **RelatedPerson** | ✓ | ✓ | relationship[], name, telecom, address |
| **Slot** | ✓ | ✓ | schedule reference, status, start/end |
| **Specimen** | ✓ | ✓ | type, collection, processing[], container[] |
| **Invoice** | ✓ | ✓ | Participant, lineItem, priceComponent |
| **AuditEvent** | ✓ | ✓ | agent[], entity[], source |

**33 resources total are fully FHIR-compliant.**

### 4.2 Partially Implemented Resources (1 resource)

| Resource | Missing Layers | Details |
|----------|---------------|---------|
| **Vitals** | No FHIR mapper, No FHIR schemas, No FHIR content negotiation | Flat table for wearable/fitness data (steps, heart rate, sleep, blood pressure, weight, SpO2, glucose, temperature). JSON-only. No `_to_fhir()`/`_to_plain()` on service. Custom `_serialize()` in router. |

---

## 5. Terminology System

### 5.1 Database Model (11 tables)

| Table | Row Count (typical) | Purpose |
|-------|---------------------|---------|
| `terminology_code_system` | ~10 | Canonical code systems (SNOMED, LOINC, ICD-10-CM, RxNorm, FHIR R4, UCUM, v2, v3, IETF BCP-47, ISO 3166) |
| `terminology_concept` | ~650,000+ | Individual coded concepts with `parent_concept_id` self-FK for hierarchy, `search_vector` tsvector for full-text search |
| `terminology_concept_synonym` | ~1,000,000+ | Alternate names for NLP/semantic matching |
| `terminology_concept_translation` | varies | Multilingual display names |
| `terminology_relationship` | ~350,000+ | IS-A and other semantic relationships |
| `terminology_value_set` | ~2,000+ | Named subsets of codes with binding_strength |
| `terminology_value_set_concept` | ~varies | M2M join: value_set ↔ concept |
| `terminology_field_binding` | ~130 | Maps `resource_type.field_name` → ValueSet |
| `terminology_concept_map` | varies | Cross-system code translations |
| `terminology_concept_embedding` | planned | JSONB vector embeddings for semantic search (pgvector migration target) |
| `terminology_audit_log` | grows | Governance trail for terminology changes |

### 5.2 Import Loaders

| Loader | Source | Record Count | Key Features |
|--------|--------|-------------|--------------|
| **SNOMED CT** | RF2 Snapshot files | ~350,000 concepts | Full IS-A hierarchy via `terminology_relationship`, FSN tag stripping, active-only filtering |
| **LOINC** | LoincTableCore.csv | ~100,000 lab codes | ACTIVE/TRIAL filter, LONG_COMMON_NAME as display |
| **RxNorm** | RXNCONSO.RRF | ~100,000 drugs | TTY prioritization (IN > SCD > BN > ...), RXCUI dedup |
| **ICD-10-CM** | CMS text file | ~72,000 diagnoses | Auto-detects tab-delimited vs fixed-width format |
| **FHIR R4 built-ins** | definitions.json.zip | ~varies | CodeSystems + ValueSets from HL7, auto-bootstraps external CodeSystems (UCUM, BCP-47, ISO 3166) |

### 5.3 Hierarchy Resolution

```sql
-- Recursive CTE for is-a filter in ValueSet expansion
WITH RECURSIVE subtree AS (
    SELECT tc.id
    FROM terminology_concept tc
    JOIN terminology_code_system cs ON cs.id = tc.code_system_id
    WHERE cs.canonical_url = $1 AND tc.code = $2 AND tc.org_id IS NULL
    UNION ALL
    SELECT child.id
    FROM terminology_concept child
    JOIN subtree s ON child.parent_concept_id = s.id
    WHERE child.org_id IS NULL
)
SELECT id FROM subtree;
```

This resolves "include all descendants of code X" in ValueSet `compose.include[].filter[op=is-a]`.

### 5.4 Terminology API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /code-systems` | List all loaded CodeSystems |
| `GET /value-sets` | List all ValueSets |
| `GET /value-sets/{id}/expand` | Expand a ValueSet to its member codes |
| `GET /search?q=diabetes` | Full-text concept search (PostgreSQL `ts_rank` + `similarity()`) |
| `POST /lookup` | Lookup single concept by system+code |
| `POST /lookup-batch` | Batch lookup (multiple system+code pairs) |
| `GET /concepts?resource=Condition&field=code` | Get allowed concepts for a resource field |
| `POST /validate` | Validate a code against its field binding |
| `POST /translate` | Cross-system code translation |
| `GET /concept-maps` | List concept maps |
| `PATCH /concept-maps/{id}` | Update concept map |
| `GET/POST/PATCH/DELETE /org-concepts` | Organization-scoped custom concepts |
| `GET /audit-log` | Terminology governance audit trail |

### 5.5 Field Binding System

Auto-generates 130+ `resource.field` → ValueSet mappings:

1. **Pass 1**: Parse `profiles-types.json` (FHIR datatype StructureDefinitions) → extract bindings from Address.use, ContactPoint.system, etc.
2. **Pass 2**: Parse `profiles-resources.json` → extract direct element bindings + inherit sub-field bindings from Pass 1
3. **Manual override**: `seed_field_bindings.py` has curated list for any additions/corrections

Example bindings:
```
Patient.gender                  → AdministrativeGender (required)
Condition.clinicalStatus        → ConditionClinicalStatusCodes (required)
Observation.code                → LOINC (example)
MedicationRequest.medication    → SNOMED CT Medication Codes (example)
```

---

## 6. Security & Authorization

### 6.1 Current State

**JWT Validation** (`app/auth/dependencies.py`):
- Extracts `Bearer` token from Authorization header
- Decodes via `PyJWKClient` fetching keys from `IAM_JWKS_URL`
- Validates audience, issuer, algorithms (`EdDSA`, `RS256`)
- Attaches payload to `request.state.user`:
  ```python
  user_id = request.state.user.get("sub")           # user identity
  org_id  = request.state.user.get("activeOrganizationId")  # tenant
  permissions = request.state.user.get("permissions", [])   # RBAC list
  ```

**Global Auth:** `get_current_user` applied to ALL routes via `api_router` dependency — unauthenticated requests get 401.

### 6.2 CRITICAL SECURITY GAPS

#### Gap 1: Permission Check is COMMENTED OUT

```python
# app/auth/dependencies.py
def require_permission(resource: str, action: str):
    async def _check(request: Request):
        # Token is validated by get_current_user
        # BUT the actual permission check is commented out:
        # if not check_permission(request.state.user, f"{resource}:{action}"):
        #     raise PermissionDeniedError(...)
        return True  # ← Always passes
    return _check
```

**Impact:** Any authenticated user can perform any operation on any resource. The `require_permission` dependency is wired into routes but does nothing beyond confirming a token exists.

#### Gap 2: Object-Level Authorization is UNSAFE

**All resources trust caller-supplied `user_id` and `org_id` from the request body:**

```python
# Route handler
resource = await service.create_resource(payload, payload.user_id, payload.org_id, created_by)
```

A malicious client can set `payload.user_id` to another user's ID and `payload.org_id` to another tenant's ID. The server does NOT verify that these match the JWT claims.

**The correct pattern:**
```python
user_id = request.state.user.get("sub")       # From JWT, never from body
org_id  = request.state.user.get("activeOrganizationId")  # From JWT, never from body
resource = await service.create_resource(payload, user_id, org_id, created_by)
```

#### Gap 3: Resource Resolvers Check Only Existence, Not Ownership

```python
async def resolve_patient(patient_id, patient_service):
    patient = await patient_service.get_raw_by_patient_id(patient_id)
    if not patient:
        raise HTTPException(404)  # Only 404, not 403
    return patient  # Returns ANY patient regardless of who owns it
```

Any authenticated user can read ANY patient, encounter, appointment, etc. regardless of `user_id` or `org_id` ownership.

#### Gap 4: List Endpoints Accept User/Owner Filters from Query Params

```python
GET /patients?user_id=<any_id>&org_id=<any_id>
```

No enforcement that `user_id` matches JWT `sub` or `org_id` matches JWT `activeOrganizationId`. A user can list another user's resources by simply changing query parameters.

### 6.3 What's Working Correctly

- **JWT signature validation** — tokens are cryptographically verified against JWKS
- **`/me` routes** — `GET /patients/me` correctly filters by JWT `sub` in the repository (safe pattern)
- **Rate limiting** — per-user, per-method sliding window via Redis
- **Global auth guard** — no unprotected data endpoints (health endpoints excluded)

### 6.4 Required Security Fixes

1. **Fix `require_permission`** — Uncomment the actual permission check and implement RBAC enforcement
2. **Enforce server-side `user_id`/`org_id`** — Extract from JWT claims in route handlers, ignore request body values for these fields
3. **Add ownership checks to resource resolvers** — Verify `model.user_id == jwt_sub` and `model.org_id == jwt_org_id` or raise 403
4. **Enforce tenant isolation on list endpoints** — Override `user_id`/`org_id` filters with JWT claims, don't trust query parameters
5. **Audit all endpoints** — Verify no data leaks across tenants/users
6. **Add `X-Request-ID` to audit trail** — Already present in structured logging, ensure it's in all error responses

---

## 7. Testing & Quality

### 7.1 Test Infrastructure

- **105 test files** across 32 resources
- **Framework**: pytest + pytest-asyncio + httpx (async test client)
- **Database**: In-memory SQLite via `aiosqlite` with `StaticPool`
- **Sequences simulated** via SQLAlchemy `before_insert` event (SQLite doesn't support PostgreSQL sequences)
- **Auth mocked**: `make_test_user()` factory creates override for `get_current_user`
- **Rate limiting disabled**: Middleware monkey-patched to pass through

### 7.2 What's Tested

Each resource's `test_core.py` covers:
- ✅ Create with minimal + full payloads
- ✅ Create with `Accept: application/fhir+json`
- ✅ Create rejects extra fields (400 OperationOutcome)
- ✅ GET by ID in both plain and FHIR formats
- ✅ GET not-found (404)
- ✅ PATCH mutable fields
- ✅ DELETE (204)
- ✅ List in plain and FHIR Bundle formats
- ✅ Permission checks (403)
- ✅ Content negotiation (Accept header)

Patient, Practitioner, and Appointment have richer test suites with sub-resource tests (names, identifiers, telecoms, addresses, etc.).

### 7.3 Testing Gaps

1. **No real PostgreSQL integration tests** — SQLite can't catch PostgreSQL-specific issues:
   - Enum type constraints
   - Sequence generation
   - Full-text search (`tsvector`, `ts_rank`)
   - Recursive CTEs (terminology hierarchy)
   - Concurrent access behavior
2. **No CI/CD pipeline** — Tests must be run manually
3. **No code coverage tracking**
4. **No property-based testing** — FHIR serialization/deserialization round-tripping not tested
5. **No performance/load tests**
6. **No integration tests for terminology** — Search, validate, lookup not tested against real data
7. **Test coverage is uneven** — 3 resources have thorough tests; the other 29 have basic test_core.py only
8. **No migration tests** — No verification that migrations apply cleanly

---

## 8. Operational Maturity

### 8.1 Current State

| Capability | Status | Details |
|-----------|--------|---------|
| **Rate Limiting** | ✅ | Redis sorted-set sliding window. 100 reads/min, 20 writes/min per user |
| **Health Checks** | ✅ | `/health` (liveness), `/health/ready` (Redis + DB ping) |
| **Structured Logging** | ✅ | JSON logs with `request_id`, `user_id`, `org_id` injection |
| **Docker** | ✅ | Multi-stage build, non-root user, healthchecks |
| **Database Migrations** | ✅ | Alembic async, single initial migration |
| **Monitoring** | ❌ | No Prometheus metrics, no APM, no traces |
| **Caching** | ❌ | Terminology queries go to PostgreSQL every time |
| **CI/CD** | ❌ | No pipeline configured |
| **Secret Management** | ❌ | Redis/DB credentials in docker-compose, no vault |
| **Disaster Recovery** | ❌ | No backup scripts, no failover strategy |
| **API Versioning** | ❌ | Hardcoded `/v1`, no deprecation strategy |

### 8.2 Rate Limiting Details

```
Read limit:  100 requests per 60-second window (GET/HEAD/OPTIONS)
Write limit: 20 requests per 60-second window (POST/PUT/PATCH/DELETE)
```

- **Algorithm**: Redis sorted-set sliding window
- **Key format**: `rate:{user_id}:{method}`
- **Excluded paths**: `/`, `/health`, `/health/ready`, `/openapi.json`, `/docs/*`, `/redoc/*`, `/favicon.ico`
- **429 response**: FHIR OperationOutcome + `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Window` headers

**Concern: Fails open.** When Redis is unavailable, falls back to process-local (in-memory) rate limiter. This is NOT coordinated across multiple uvicorn workers — a user could get 2× or 4× the limit by hitting different workers.

### 8.3 Logging

Structured JSON logging via `app/core/logging.py`:
```json
{
  "timestamp": "2026-05-30T10:00:00Z",
  "level": "INFO",
  "logger": "app.routers.patient",
  "message": "Patient created",
  "request_id": "abc-123",
  "user_id": "user-uuid",
  "org_id": "org-uuid",
  "resource_id": 10001
}
```

Request ID is injected via ASGI middleware using `contextvars`.

### 8.4 Docker/Deployment

- **Dockerfile**: Multi-stage (builder + runtime), non-root `appuser` (uid 1001), healthcheck
- **docker-compose.yml**: 3 services (api, db, redis), `bezs-net` bridge network
- **docker-compose.prod.yml**: Pulls from `ghcr.io/naveenraj-g/fhir-server-v1:latest`
- **Entrypoint**: `alembic upgrade head` → `uvicorn --workers 2`
- **Concern**: `uv` pulled from `ghcr.io/astral-sh/uv:latest` — unpinned dependency, could break on rebuild

---

## 9. What's Missing — Feature Gap Analysis

### 9.1 Critical Gaps

| # | Feature | Why It Matters | Complexity |
|---|---------|---------------|------------|
| 1 | **Server-side authorization enforcement** | Data is accessible across tenants/users. HIPAA/GDPR violation risk. | Medium |
| 2 | **FHIR `_include` / `_revinclude`** | Cannot fetch related resources in a single request. Required for any real clinical workflow. | High |
| 3 | **FHIR Search Parameter Framework** | No `_sort`, `_count`, `_has`, chained parameters, or composite search params. | High |
| 4 | **Vitals FHIR compliance** | Vitals is the only non-FHIR resource. Should be modeled as FHIR Observation vital-signs profile. | Medium |
| 5 | **FHIR Subscription resource** | No push notifications for resource changes. Foundation for all workflow automation. | High |

### 9.2 Important Gaps

| # | Feature | Why It Matters | Complexity |
|---|---------|---------------|------------|
| 6 | **FHIR AuditEvent auto-generation** | Every create/update/delete should auto-generate an AuditEvent record. Required for HIPAA compliance. | Medium |
| 7 | **Bulk FHIR Export (`$export`)** | Population-level data export required for analytics, reporting, and patient data portability. | High |
| 8 | **FHIR Patch formats** | Currently only merge-patch. JSON Patch and FHIRPath Patch are required for true FHIR compliance. | Medium |
| 9 | **Terminology caching (Redis)** | Terminology lookups hit PostgreSQL on every request. TTL cache would dramatically improve performance. | Low |
| 10 | **Observability stack** | No Prometheus metrics, no OpenTelemetry traces — can't monitor performance or debug latency issues. | Medium |
| 11 | **FHIR `$batch` / `$transaction`** | Cannot submit multiple operations atomically. Required for complex clinical workflows. | High |
| 12 | **FHIR Questionnaire resource** | Only QuestionnaireResponse exists. Need Questionnaire to define form structures. | Medium |

### 9.3 Future Enhancements

| # | Feature | Why It Matters | Complexity |
|---|---------|---------------|------------|
| 13 | **FHIR Consent resource** | Patient consent management for data sharing, research, and privacy | High |
| 14 | **SMART on FHIR Launch** | App launch framework for third-party integrations | High |
| 15 | **GraphQL API** | Alternative query interface for flexible data fetching | High |
| 16 | **FHIR R5 migration** | Some models already have R5 fields (Encounter, Appointment). Full R5 support future-proofs the server. | Very High |
| 17 | **HL7 v2 Integration** | Lab and hospital systems predominantly use HL7 v2. Need ADT/ORM/ORU translation layer. | Very High |

---

## 10. Non-Feature Improvements

### 10.1 Security Hardening (Highest Priority)

1. **Fix object-level authorization** — Extract `user_id`/`org_id` from JWT in route handlers, ignore request body values
2. **Uncomment `require_permission`** — Implement actual RBAC enforcement
3. **Add ownership checks to resource resolvers** — 403 if `model.user_id != jwt_sub` or `model.org_id != jwt_org_id`
4. **Enforce tenant isolation on list queries** — Repository should always filter by JWT claims, not query params
5. **Audit all trust points** — Document every place where the server trusts client input for authorization decisions

### 10.2 Test Infrastructure Upgrade

1. **PostgreSQL integration tests** — Use testcontainers or dedicated test DB, not SQLite
2. **CI/CD pipeline** — GitHub Actions: lint → test → build → security scan
3. **Property-based testing** — Round-trip FHIR ↔ plain ↔ model serialization with Hypothesis
4. **Load testing** — Locust or k6 for concurrent request behavior
5. **Coverage tracking** — pytest-cov with minimum threshold

### 10.3 Database Optimizations

1. **Query plan analysis** — Review slow queries, add covering indexes
2. **Connection pool tuning** — Review pool size, overflow, timeout settings
3. **Read replicas** — For terminology and search-heavy workloads
4. **Partitioning strategy** — AuditEvent and Observation tables will grow large

### 10.4 Code Consistency

1. **Standardize across resources** — Newer resources (Immunization, Procedure, Task) have slightly different patterns
2. **Shared utility extraction** — Some mapper helpers are duplicated across resources
3. **Schema consolidation** — Some FHIR schemas have redundant definitions

### 10.5 Migration Strategy

1. **Break single migration** — `cc0eb35c2ced` is a monolith. Incremental migrations needed for production
2. **Add migration testing** — Verify migrations apply and rollback cleanly
3. **Seed data migrations** — Mock data and terminology bindings should be versioned

### 10.6 Error Handling Refinement

1. **Some 500s should be 422s** — Validation errors in some resources raise generic exceptions instead of domain errors
2. **Consistent OperationOutcome across all errors** — Verify all error paths
3. **Add error codes to OperationOutcome** — Make errors machine-parseable

---

## 11. The Business Logic Server Layer

This is the most critical architectural decision. The FHIR Server is the **data layer**. A separate server handles business logic.

### 11.1 Design Principles

1. **Never bypass the FHIR Server** — All data access via FHIR REST API calls, never direct DB
2. **Event-driven** — FHIR Server emits events on create/update/delete; BLS subscribes
3. **Workflow state in FHIR Task** — Task.status, Task.businessStatus, Task.input/output carry workflow state
4. **Shared JWT issuer** — BLS validates token, FHIR Server re-validates on each call
5. **Tenant isolation at both layers** — org_id propagates from BLS to FHIR Server

### 11.2 Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Consumers                        │
│    (Mobile App, Web Portal, EMR, Patient Portal, ...)        │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS (JWT Bearer)
┌─────────────────────────────▼───────────────────────────────┐
│                  Business Logic Server                       │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Auth Service │ │  Workflow    │ │  Notification        │ │
│  │ (RBAC/ABAC)  │ │  Engine      │ │  Service             │ │
│  │ User Mgmt    │ │  State       │ │  Push/Email/SMS      │ │
│  │ Consent Mgmt │ │  Machines    │ │  Template Engine     │ │
│  │ Audit Viewer │ │  Escalation  │ │  Delivery Tracking   │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │ Cron/Job     │ │  Business    │ │  Integration         │ │
│  │ Scheduler    │ │  Rules       │ │  Hub                 │ │
│  │ Reminders    │ │  Engine      │ │  HL7 v2 → FHIR       │ │
│  │ Reports      │ │  CDS Hooks   │ │  Lab Interfaces      │ │
│  │ Data Archival│ │  Validation  │ │  Payer Gateways      │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Reporting & Analytics                    │   │
│  │  Operational Dashboards, CQM, Population Health,     │   │
│  │  FHIR Measure/MeasureReport                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                              │ FHIR REST API (HTTPS + JWT)
┌─────────────────────────────▼───────────────────────────────┐
│                    FHIR Server (Data Layer)                   │
│  34 FHIR Resources + Terminology + Content Negotiation       │
└─────────────────────────────┬───────────────────────────────┘
                              │ SQL
┌─────────────────────────────▼───────────────────────────────┐
│                 PostgreSQL 15 + Redis 7                      │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Service Definitions

#### Auth Service
**Purpose:** User management, role-based access control, consent management, audit trail viewing.

**Features:**
- User CRUD with role assignment (admin, doctor, nurse, receptionist, patient)
- Permission management UI (resource:action granularity)
- Patient-provider relationship management
- FHIR Consent resource management (opt-in/opt-out for data sharing)
- Break-glass access protocols for emergencies
- Audit trail viewer with filtering by user, resource, date range
- Session management (Redis-backed sessions from FHIR Server)

**Data it manages:**
- User profiles (separate from FHIR Practitioner/Patient)
- Role and permission definitions
- Consent records (FHIR Consent, stored in FHIR Server)
- Audit queries (reads FHIR AuditEvent from FHIR Server)

#### Workflow Engine
**Purpose:** State machines for clinical workflows. Uses FHIR Task as the workflow carrier.

**Workflow Examples:**

**Appointment Lifecycle:**
```
requested → scheduled → checked-in → in-progress → completed → billed
                                                     ↓
                                                no-show / cancelled
```

**Lab Order Lifecycle:**
```
ordered → specimen-collected → received → in-progress → completed → verified → reported
```

**Referral Management:**
```
requested → reviewed → accepted → scheduled → completed → report-sent → closed
                                                      ↓
                                                    declined
```

**Implementation approach:**
- Each workflow is a state machine (use a library like `transitions` or a simple FSM)
- Current state stored in `Task.status` and `Task.businessStatus`
- Transitions triggered by API calls from BLS services
- On each transition: validate preconditions, execute actions (create/update FHIR resources), emit events
- Task.input carries workflow input data; Task.output carries results

#### Cron Scheduler
**Purpose:** Scheduled and recurring tasks.

**Jobs:**
| Job | Schedule | Action |
|-----|----------|--------|
| Appointment reminders | 24h before, 1h before appointment | Send push/email/SMS via Notification Service |
| Daily terminology sync | Daily at 2am | Refresh from upstream sources (SNOMED, LOINC, RxNorm) |
| Report generation | Daily at 6am | Census report, revenue report |
| Data archival | Weekly | Archive completed encounters > 1 year old |
| Claim submission | Daily at 8pm | Batch submit claims to payers |
| Health check monitoring | Every 5 min | Ping FHIR Server, alert on failure |
| Session cleanup | Hourly | Expire old Redis sessions |

**Implementation:**
- Use APScheduler or Celery Beat
- Each job calls FHIR Server APIs (never direct DB)
- Job status logged as FHIR Task resources
- Failed jobs retry with exponential backoff
- Alert on repeated failures

#### Notification Service
**Purpose:** Multi-channel notifications for clinical events.

**Channels:**
- Push notifications (FCM for Android, APNs for iOS)
- Email (SMTP or SendGrid/Mailgun)
- SMS (Twilio or similar)
- In-app (WebSocket for real-time)

**Event → Notification Mapping:**
| FHIR Event | Notification | Channel | Recipient |
|-----------|-------------|---------|-----------|
| Appointment.created | "Your appointment is scheduled for {date}" | Push + Email | Patient |
| Appointment.status → booked | "Appointment confirmed" | Push | Patient |
| Appointment (24h reminder) | "Reminder: Appointment tomorrow at {time}" | Push + SMS | Patient |
| Observation (abnormal result) | "New lab results available" | Push | Patient |
| Observation (critical result) | "URGENT: Critical lab result" | Push + SMS + Email | Provider |
| Task.created | "New task assigned: {title}" | Push + In-app | Assignee |
| Task.overdue | "Overdue task: {title}" | Email | Assignee + Manager |
| Claim.status → denied | "Claim denied: {reason}" | Email | Billing dept |

**Template system:** FHIR Communication resources store notification templates with placeholders (`{patient_name}`, `{appointment_date}`, etc.). Render with Jinja2.

#### Business Rules Engine
**Purpose:** Clinical decision support, validation rules, workflow conditions.

**Rule Examples:**
- Drug-drug interaction check (RxNorm concepts)
- Drug-allergy check (MedicationRequest vs AllergyIntolerance)
- Duplicate order detection (same test ordered within 24h)
- Age/gender appropriateness (mammogram for male patient → alert)
- Insurance eligibility check (before scheduling procedure)
- Lab reference range validation (Observation.value vs LOINC reference range)
- Appointment conflict detection (practitioner double-booked)

**Implementation:**
- Rules as Python functions with `@rule(description, severity)` decorator
- Triggered by FHIR Subscription events
- Results stored as FHIR ClinicalImpression or flagged Task
- Severity levels: info, warning, critical

#### Integration Hub
**Purpose:** Translate external healthcare system messages to FHIR.

**Protocols:**
| Protocol | Use Case | Direction |
|----------|----------|-----------|
| HL7 v2 (ADT) | Patient admission/discharge/transfer | Inbound → FHIR Patient + Encounter |
| HL7 v2 (ORM) | Lab/radiology orders | Inbound → FHIR ServiceRequest |
| HL7 v2 (ORU) | Lab/radiology results | Inbound → FHIR Observation + DiagnosticReport |
| ASTM LIS2-A2 | Lab instrument interfaces | Inbound → FHIR Observation |
| X12 837 | Claims | Outbound → Payer |
| NCPDP | Pharmacy | Outbound → Pharmacy system |
| DICOMweb | Imaging | Inbound → FHIR ImagingStudy |

**Architecture:**
- MLLP listener for HL7 v2 over TCP
- Parse → Validate → Transform → Post to FHIR Server
- Transformation mappings stored in database, not hardcoded
- Failed messages go to dead-letter queue for manual review

#### Reporting & Analytics
**Purpose:** Operational and clinical analytics.

**Reports:**
| Report | Data Source | Frequency |
|--------|------------|-----------|
| Daily census | Encounter (active today) | Daily |
| Appointment utilization | Appointment (completed vs no-show) | Weekly |
| Revenue by department | Claim + Invoice | Monthly |
| Lab turnaround time | ServiceRequest → Observation completed | Weekly |
| Clinical quality measures | Various (CQM definitions) | Quarterly |
| Patient satisfaction | QuestionnaireResponse | Monthly |

**Implementation:**
- Aggregation queries via FHIR Server APIs (use `_include`, bulk export)
- Store aggregated results in analytics database (materialized views)
- Dashboard via Metabase or custom UI
- FHIR Measure and MeasureReport for CQMs

### 11.4 Event System (FHIR Server → BLS)

The FHIR Server needs to emit events so the BLS can react:

**Option A: Webhook registration**
```
FHIR Server stores webhook URLs per organization.
On create/update/delete, POSTs the resource to each webhook.
BLS registers its webhook endpoint.
```

**Option B: Redis Pub/Sub**
```
FHIR Server publishes to redis channel "fhir:events".
BLS subscribes to same channel.
Lower latency, no HTTP overhead.
```

**Option C: Database NOTIFY/LISTEN**
```
FHIR Server uses PostgreSQL NOTIFY on resource changes.
BLS LISTENs on the channel.
Simplest to implement, but tied to specific DB.
```

**Recommended: Option A (Webhooks)** — Most portable, allows multiple consumers, standard pattern. Start simple, add retry + batching later.

**Event payload:**
```json
{
  "event": "resource.created",
  "resource_type": "Appointment",
  "resource_id": 40001,
  "timestamp": "2026-05-30T10:00:00Z",
  "org_id": "org-uuid",
  "user_id": "user-uuid",
  "resource": { /* full FHIR resource */ }
}
```

### 11.5 Technology Stack Recommendation for BLS

| Component | Recommendation | Why |
|-----------|---------------|-----|
| **Framework** | FastAPI | Same as FHIR Server, team familiarity |
| **Workflow Engine** | `transitions` library or Temporal | Lightweight vs full-featured |
| **Job Queue** | Celery + Redis or ARQ | Async task processing |
| **Cron Scheduler** | APScheduler or Celery Beat | Recurring job scheduling |
| **Push Notifications** | Firebase Admin SDK + APNs | Cross-platform push |
| **Email** | aiosmtplib or SendGrid/Mailgun SDK | Async email sending |
| **SMS** | Twilio SDK | SMS gateway |
| **WebSocket** | FastAPI WebSocket | Real-time in-app notifications |
| **Database** | PostgreSQL 15 (same instance or separate) | Consistency |
| **Cache** | Redis (same as FHIR Server or separate) | Session + rate limit |
| **Auth** | Share JWT issuer with FHIR Server | Single sign-on |
| **API Client** | httpx (async) | Call FHIR Server APIs |
| **Monitoring** | Prometheus + OpenTelemetry | Observability |

---

## 12. Implementation Roadmap

### Phase 1: Security Hardening (Now — Week 1-2)

**Goal:** Make the FHIR Server safe for production use.

1. Fix `require_permission` — uncomment the actual permission check
2. Add server-side `user_id`/`org_id` enforcement (trust JWT, not request body)
3. Add ownership checks to all resource resolvers (403 for cross-tenant access)
4. Enforce tenant isolation on all list queries
5. Audit all endpoints for authorization gaps
6. Add integration tests for authorization scenarios

### Phase 2: Test Infrastructure (Week 2-3)

**Goal:** Reliable testing with real PostgreSQL.

1. Set up test PostgreSQL container (testcontainers-python)
2. Convert integration tests from SQLite to PostgreSQL
3. Add CI/CD pipeline (GitHub Actions)
4. Add code coverage tracking
5. Add property-based tests for FHIR serialization round-trips

### Phase 3: FHIR Completeness (Week 3-6)

**Goal:** Full FHIR compliance and missing features.

1. Vitals FHIR compliance — model as Observation vital-signs profile
2. FHIR `_include`/`_revinclude` search parameters
3. FHIR Subscription resource (foundation for BLS events)
4. FHIR `$batch`/`$transaction` operations
5. Bulk FHIR export `$export`
6. FHIR Patch formats (JSON Patch, FHIRPath Patch)

### Phase 4: Operational Readiness (Week 4-8)

**Goal:** Production monitoring and performance.

1. Prometheus metrics endpoint
2. OpenTelemetry tracing
3. Terminology caching in Redis (TTL-based)
4. Performance benchmarking
5. Database index optimization
6. Secret management (env vars from vault/secrets manager)

### Phase 5: Business Logic Server — Foundation (Week 6-10)

**Goal:** Scaffold the BLS and core services.

1. BLS project scaffold (separate repo, shared auth config)
2. FHIR Server webhook/event system
3. Auth Service (RBAC UI + API)
4. Workflow Engine foundation (Task-based state machines)
5. Notification Service foundation (multi-channel)

### Phase 6: Business Logic Server — Features (Week 10-16)

**Goal:** Key clinical workflows.

1. Appointment workflow (full lifecycle: request → schedule → check-in → complete → bill)
2. Lab order workflow (order → collect → receive → result → verify)
3. Referral management (request → accept → schedule → complete → report)
4. Notification templates and delivery
5. Cron scheduler (reminders, reports, terminology sync)

### Phase 7: Advanced (Week 16+)

**Goal:** Integration and analytics.

1. HL7 v2 integration (ADT, ORM, ORU)
2. Clinical decision support (drug interactions, duplicate detection)
3. Reporting & analytics dashboards
4. SMART on FHIR launch
5. FHIR R5 migration planning

---

## Appendix A: Key Files Reference

### Core Architecture
- `app/main.py` — Application factory, lifespan, middleware, route registration
- `app/routers/__init__.py` — Master `api_router` aggregating 34 resource routers
- `app/di/container.py` — Root DI container with all resource modules
- `app/core/config.py` — Pydantic Settings (5 env vars)
- `app/core/database.py` — Async SQLAlchemy engine + FHIRBase
- `app/core/content_negotiation.py` — FHIR vs plain JSON response formatting

### Auth
- `app/auth/dependencies.py` — JWT validation, `get_current_user`, `require_permission` (BROKEN)
- `app/auth/{resource}_deps.py` — Resource resolvers (35 files)

### Errors
- `app/errors/base.py` — `ApplicationError` base class
- `app/errors/handlers.py` — FastAPI exception → OperationOutcome handlers

### Terminology
- `app/models/terminology/terminology.py` — 11 terminology tables
- `app/repository/terminology_repository.py` — Terminology queries including recursive CTE
- `app/terminology/import_/loaders/` — SNOMED, LOINC, RxNorm, ICD-10-CM, FHIR R4 importers

### Testing
- `tests/conftest.py` — SQLite setup, auth mocking, sequence simulation
- `tests/integration/{resource}/test_core.py` — Standard CRUD test contract

### Documents
- `docs/codeable-concepts.md` — Terminology service implementation plan
- `docs/workflows/` — Inpatient, outpatient, telemedicine workflow guides
- `PRODUCTION_READINESS_REPORT.md` — Current production assessment (FAIL verdict)

---

## Appendix B: Terminology Data Sources

| Dataset | Source | How to Obtain |
|---------|--------|---------------|
| FHIR R4 definitions | HL7 | Download `definitions.json.zip` from HL7 FHIR downloads |
| SNOMED CT | SNOMED International | Requires UMLS license (NLM) or national license |
| LOINC | Regenstrief Institute | Free download from loinc.org |
| RxNorm | NLM UMLS | Requires UMLS license (free for research) |
| ICD-10-CM | CMS | Free download from cms.gov |

Instructions in `terminology_data/README.md`.

---

*End of Analysis. This document should be maintained as the single source of truth for the FHIR Server architecture and roadmap.*
