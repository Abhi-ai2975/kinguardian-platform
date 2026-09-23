# Architecture

## Overview

`fhir-gql` is a middleware/orchestration layer in front of [`fhir-server`](../fhir-server). It owns everything `fhir-server` deliberately doesn't: authentication, RBAC, rate limiting, and (as it grows) use-case validation and workflow orchestration. `fhir-server` remains a pure FHIR R4 data plane — it persists whatever valid payload it receives and enforces no business rules.

```
Client Applications (Web / Mobile / AI Agent)
              │  HTTPS — REST, JWT Bearer
              ▼
         fhir-gql   (this service)
              │  HTTP — plain JSON, no auth
              ▼
        fhir-server  (FHIR R4 data layer)
              │
       PostgreSQL + Redis
```

**Key contract:**

- This service never writes to a database directly — all persistence goes through the `fhir-server` REST API
- `fhir-server` never validates business rules — it trusts whatever valid payload it receives
- Auth claims (`user_id`, `org_id`, `created_by`, `updated_by`) are resolved here from the validated JWT and passed through on every write — callers never supply them directly

### On the project name

The directory is named `fhir-gql`, but the current implementation is a REST API, not GraphQL — `main.py`'s FastAPI app is titled "Middleware API" and every route is a conventional FastAPI router. A GraphQL layer may be added on top later without restructuring, since resolvers would call the same service methods the REST routers do.

---

## Request Flow

```
Router → Service → FhirClient (httpx) → fhir-server
```

- **Router** (`app/routers/<resource>.py`) — FastAPI route, validated request body, calls the resource's service
- **Service** (`app/services/<resource>_service.py`) — orchestration; will host use-case/business-rule validation as it grows
- **FhirClient** (`app/fhir_client/<resource>.py`) — typed `httpx` wrapper for one resource's `fhir-server` endpoints; all clients share a single connection pool via the DI-provided `httpx.AsyncClient` singleton

---

## Authentication

`app/auth/dependencies.py`:

1. `get_current_user` extracts the `Authorization: Bearer <jwt>` header
2. `decode_token` fetches the signing key from `IAM_JWKS_URL` via a module-level `PyJWKClient` (cached; only re-fetches on a `kid` cache miss, e.g. key rotation)
3. The token signature, `exp`, `iss`, and `aud` (both checked against `IAM_ISSUER`) are validated
4. The decoded payload is stored on `request.state.user` for downstream handlers

`get_current_user` is applied once, globally, to every route under `/api/v1` (`app/main.py`), so no individual router needs to re-declare it.

The generated OpenAPI schema is overridden (`app/main.py::_custom_openapi`) to register a `BearerAuth` security scheme, since FastAPI has no constructor param for top-level `security`/`securitySchemes` — this is what makes the Swagger UI "Authorize" button work.

---

## Rate Limiting

`app/middleware/rate_limit.py` implements a Redis-backed sliding window:

1. Each request's timestamp is added to a Redis sorted set keyed by client identity + method class (read/write)
2. Members older than `now - RATE_LIMIT_WINDOW` are trimmed from the set
3. If the remaining count exceeds the configured limit (`RATE_LIMIT_READ` for GET/HEAD, `RATE_LIMIT_WRITE` for POST/PATCH/DELETE), the request is rejected with `429`

Client identity is the JWT `sub` claim for authenticated requests, or the leftmost `X-Forwarded-For` IP (falling back to the TCP peer) for unauthenticated ones.

If Redis is unreachable at startup or during a request, the middleware falls back to an in-process Python list per key. This fallback is **not** safe across multiple workers/instances — each process tracks its own counters, effectively multiplying the limit by worker count — and logs an error to signal degraded protection.

Health, docs, and static asset paths are excluded from rate limiting.

---

## Dependency Injection

`app/di/container.py` is the composition root. `dependency-injector`'s `WiringConfiguration(packages=["app"])` scans the whole `app` package at startup and resolves any `@inject`-decorated function with a `Provide[Container.*]` type hint — no per-module wiring calls needed.

```
Container (root)
├── core                →  CoreContainer   (shared httpx AsyncClient → FhirClient singleton)
├── organization        →  OrganizationContainer
├── location            →  LocationContainer
├── healthcare_service  →  HealthcareServiceContainer
├── schedule            →  ScheduleContainer
├── slot                →  SlotContainer
├── practitioner        →  PractitionerContainer
├── practitioner_role   →  PractitionerRoleContainer
├── patient             →  PatientContainer
├── appointment         →  AppointmentContainer
├── encounter           →  EncounterContainer
├── service_request     →  ServiceRequestContainer
├── medication_request  →  MedicationRequestContainer
├── observation         →  ObservationContainer
├── condition           →  ConditionContainer
├── diagnostic_report   →  DiagnosticReportContainer
└── document_reference  →  DocumentReferenceContainer
```

Every domain container receives the shared `core` container so all resource clients reuse the same `httpx.AsyncClient` connection pool rather than opening a new one each.

---

## Error Handling

`app/errors/` defines an `AppError` hierarchy. `app/main.py` registers handlers for `AppError`, FastAPI's `HTTPException`, Pydantic's `RequestValidationError`, and a catch-all `Exception` handler, so every failure mode returns a consistent JSON error shape.

---

## Directory Layout

```
app/
├── auth/           # JWT validation (get_current_user, decode_token)
├── core/           # config, logging, redis client, request-id middleware
├── di/             # dependency-injector container + per-resource modules
├── errors/         # AppError hierarchy + handlers
├── fhir_client/    # typed httpx wrappers, one per fhir-server resource
├── middleware/     # RateLimitMiddleware
├── routers/        # FastAPI route definitions, one per resource
├── schemas/        # Pydantic request/response schemas, one package per resource
└── services/       # thin orchestration layer between routers and FhirClient
```

---

## Deployment

The Docker image (`Dockerfile`) is a two-stage build (uv-managed venv → slim runtime, non-root user). `docker-compose.yml` runs only this service's container — it joins the external network created by `fhir-server`'s own compose stack (`fhir-server_fhir-net`) so it can reach `fhir-server` and share its Redis instance by internal hostname, rather than standing up a second Redis.
