# FHIR Server — Agent Reference

This file is the authoritative guide for AI coding agents working in this repository.
Read the full file before making any changes. Everything in this project follows strict patterns — do not deviate.

---

## What This Project Is

A **FHIR R4-compliant REST API** built with FastAPI + PostgreSQL. It serves six healthcare resources:

| Resource | Route prefix | Format |
|---|---|---|
| Patient | `/api/fhir/v1/patients` | FHIR + plain JSON |
| Practitioner | `/api/fhir/v1/practitioners` | FHIR + plain JSON |
| Encounter | `/api/fhir/v1/encounters` | FHIR + plain JSON |
| Appointment | `/api/fhir/v1/appointments` | FHIR + plain JSON |
| QuestionnaireResponse | `/api/fhir/v1/questionnaire-responses` | FHIR + plain JSON |
| Vitals | `/api/v1/vitals` | Plain JSON only |

Every FHIR resource returns either FHIR R4 JSON (`Accept: application/fhir+json`) or simplified snake_case JSON (`Accept: application/json`), chosen per-request via the Accept header.

---

## Stack

```
FastAPI + Uvicorn       — web framework
PostgreSQL 15           — database (async via asyncpg)
SQLAlchemy 2.0+ async   — ORM
PyJWT + PyJWKClient     — JWT auth (JWKS endpoint)
Redis 7                 — server-side sessions
dependency-injector     — DI container
pydantic-settings       — env config
uv                      — package manager
Python 3.12+
```

---

## Strict 4-Layer Architecture

```
Router  →  Service  →  Repository  →  ORM Model
```

**Never skip layers.** Routers call services. Services call repositories. Repositories own all DB I/O.

### Router (`app/routers/<resource>.py`)
- Accepts HTTP request, validates body via Pydantic schema
- Extracts JWT claims: `request.state.user.get("sub")` = user_id/created_by, `request.state.user.get("activeOrganizationId")` = org_id
- Calls service methods
- Returns `format_response()` or `format_paginated_response()`

### Service (`app/services/<resource>_service.py`)
- Thin wrapper — delegates everything to repository
- Hosts `_to_fhir(model)` and `_to_plain(model)` mapper wrappers
- Cross-entity logic lives here (e.g. auto-resolving patient_id from user_id in VitalsService)

### Repository (`app/repository/<resource>_repository.py`)
- All SQL via async SQLAlchemy
- Session-per-operation: `async with self.session_factory() as session:`
- `_with_relationships(stmt)` — always use for queries that will be serialized (prevents async lazy-load failures)
- `_apply_list_filters(stmt, ...)` — shared WHERE clause builder used by both `list()` and `get_me()`

### ORM Model (`app/models/`)
- Internal PK: `id` — never exposed
- Public ID: `<resource>_id` — sequence-based, starts at 10000+ (different base per resource)
- Always has: `user_id`, `org_id`, `created_by`, `updated_by`, `created_at`, `updated_at`

---

## Public ID Sequence Bases

| Resource | Public ID field | Sequence start |
|---|---|---|
| Patient | `patient_id` | 10000 |
| Encounter | `encounter_id` | 20000 |
| Practitioner | `practitioner_id` | 30000 |
| Appointment | `appointment_id` | 40000 |
| QuestionnaireResponse | `questionnaire_response_id` | 60000 |
| Vitals | `vitals_id` | 70000 |

---

## Authentication

`get_current_user` is applied globally in `main.py` — all routes are protected.

JWT claims available in every route via `request.state.user`:
```python
user_id = request.state.user.get("sub")                    # user identity
org_id  = request.state.user.get("activeOrganizationId")   # tenant identity
```

**FHIR resources** use `require_permission("<resource>", "<action>")` as a route dependency for RBAC.
**Vitals** does NOT use `require_permission` — it uses `resolve_vitals` in function params only.

---

## Resource Resolver Dependency Pattern

Every resource has `app/auth/<resource>_deps.py` with `resolve_<resource>()`. It resolves the model by public ID and raises 404 if not found — no 403 ownership check (ownership is enforced only on `/me` routes via `user_id` filter in the repository):

```python
async def resolve_appointment(
    appointment_id: int = Path(..., ge=1, description="Public appointment identifier."),
    appointment_service: AppointmentService = Depends(get_appointment_service),
) -> AppointmentModel:
    appt = await appointment_service.get_raw_by_appointment_id(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt
```

Used in route signatures as `appointment: AppointmentModel = Depends(resolve_appointment)`.

---

## Content Negotiation

```python
# app/core/content_negotiation.py
return format_response(service._to_fhir(model), service._to_plain(model), request)
return format_paginated_response([...fhir...], [...plain...], total, limit, offset, request)
```

- `Accept: application/fhir+json` → FHIR R4 camelCase + `resourceType`
- `Accept: application/json` (or absent) → snake_case flat JSON

**Vitals does not use content negotiation** — returns `JSONResponse(content=jsonable_encoder(...))` only.

---

## OpenAPI Response Schema Pattern

**Do NOT use `response_model=` on routes.** Use inline `responses=` dicts instead.

```python
# Module-level — computed once at import time
_SINGLE_200 = {200: {"content": {
    "application/json":      {"schema": inline_schema(PlainEncounterResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIREncounterSchema.model_json_schema())},
}}}
_SINGLE_201 = {201: _SINGLE_200[200]}          # Same content, correct 201 status for POST
_LIST_200 = {200: {"description": "Paginated list", "content": {
    "application/json":      {"schema": inline_schema(PaginatedEncounterResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIREncounterBundle.model_json_schema())},
}}}

# Route usage
@router.post("/",    status_code=201, responses={**_SINGLE_201, **_ERR_AUTH, **_ERR_VALIDATION})
@router.get("/{id}",                  responses={**_SINGLE_200, **_ERR_AUTH, **_ERR_NOT_FOUND})
@router.patch("/{id}",                responses={**_SINGLE_200, **_ERR_AUTH, **_ERR_NOT_FOUND})
@router.get("/",                      responses={**_LIST_200,   **_ERR_AUTH})
```

`inline_schema()` from `app/core/schema_utils.py` resolves all `$ref`/`$defs` so OpenAPI has no dangling references.

---

## Pydantic Schemas

### Location: `app/schemas/<resource>.py`

Three classes per resource:
1. `XxxCreateSchema` — `ConfigDict(extra="forbid")`, all optional except required fields, `json_schema_extra` with a full example that **must include `user_id` and `org_id`**
2. `XxxPatchSchema` — `ConfigDict(extra="forbid")`, all fields optional, excludes immutable fields
3. `XxxResponseSchema` (only for non-FHIR resources like Vitals) — includes `id`, `created_at`, `updated_at`

### Location: `app/schemas/fhir/<resource>.py`

- `FHIRXxxSchema` — FHIR R4 camelCase
- `PlainXxxResponse` — snake_case
- `PaginatedXxxResponse` — wraps `List[PlainXxxResponse]` + `total`, `limit`, `offset`
- `FHIRXxxBundle` — FHIR Bundle with entries
- All exported from `app/schemas/fhir/__init__.py`

---

## FHIR References in DB

FHIR references like `"Patient/10001"` are stored as two columns:
```python
subject_type = Column(Enum(SubjectReferenceType))   # "Patient"
subject_id   = Column(Integer)                       # 10001
```

Reconstructed in mappers:
```python
f"{model.subject_type.value}/{model.subject_id}"   # → "Patient/10001"
```

**Closed-set vs open-set:** Use `Enum(MyEnumClass, name="pg_type_name")` when the allowed resource types are a fixed list (e.g. `Reference(Condition|Procedure)`). Use plain `String` when any resource type is allowed.

---

## CodeableReference in DB (R5)

`CodeableReference` combines a `CodeableConcept` (concept) and a `Reference` (reference). Both halves are optional. Every CodeableReference child table gets **all 7 columns**:

```python
# concept half
coding_system  = Column(String, nullable=True)
coding_code    = Column(String, nullable=True)
coding_display = Column(String, nullable=True)
text           = Column(String, nullable=True)

# reference half — closed set → Enum; open set → String
reference_type    = Column(Enum(MyReferenceType, name="my_ref_type"), nullable=True)
reference_id      = Column(Integer, nullable=True)
reference_display = Column(String, nullable=True)
```

**Enum naming:** `<Resource><Field>ReferenceType` in Python, `<table>_reference_type` as the PostgreSQL type name.

**Repository:** parse the reference string with `_parse_open_ref()`, then validate with `_cast_ref_type(ref_type_str, MyReferenceType, "field.reference")` — raises HTTP 422 for unknown types.

**Migration:** Alembic autogenerate emits uppercase enum member names. Always manually rewrite to use `postgresql.ENUM('TitleCaseValue', ...)` with `create_type=False` on the column and an explicit `.create(op.get_bind(), checkfirst=True)` call. VARCHAR→Enum requires `postgresql_using='col::pg_type_name'`.

---

## Paginated Responses

All list endpoints (`GET /` and `GET /me`) return:
```json
{ "total": 150, "limit": 50, "offset": 0, "data": [...] }
```

Query params on every list/me route:
```python
limit:  int = Query(50, ge=1, le=200)
offset: int = Query(0, ge=0)
```

`/me` routes accept the same resource-specific filters as `GET /` — minus `user_id`/`org_id` (those come from the JWT). Example: `GET /me?status=booked&start_from=2026-01-01`.

---

## Route Order Rule

Declare `/me` **before** `/{id}` in every router file. FastAPI matches routes top-to-bottom; if `/{id}` comes first, the literal string `"me"` will match the path parameter and fail.

```python
@router.get("/me", ...)      # MUST be first
@router.get("/{encounter_id}", ...)   # second
```

---

## `status` Parameter Naming

A `status` query parameter shadows `from fastapi import status`. Always rename:

```python
enc_status:  Optional[str] = Query(None, alias="status")   # encounters
appt_status: Optional[str] = Query(None, alias="status")   # appointments
qr_status:   Optional[str] = Query(None, alias="status")   # questionnaire_responses
```

---

## Audit Pattern (All Routes)

```python
# POST routes
created_by: str = request.state.user.get("sub")
resource = await service.create_resource(payload, payload.user_id, payload.org_id, created_by)

# PATCH routes
updated_by: str = request.state.user.get("sub")
updated = await service.patch_resource(resource.resource_id, payload, updated_by=updated_by)
```

---

## PATCH Implementation

Repositories use `model_dump(exclude_unset=True)` so only explicitly-provided fields are written:

```python
async def patch(self, resource_id, payload, updated_by=None):
    async with self.session_factory() as session:
        model = (await session.execute(select(XxxModel).where(...))).scalars().first()
        if not model:
            return None
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(model, field, value)
        if updated_by:
            model.updated_by = updated_by
        await session.commit()
        await session.refresh(model)
    return await self.get_by_id(resource_id)   # reload with relationships
```

---

## DI Container

Each resource has a DI module (`app/di/modules/<resource>.py`) and a FastAPI wrapper (`app/di/dependencies/<resource>.py`).

```python
# di/modules/appointment.py
class AppointmentContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()
    appointment_repository = providers.Factory(
        AppointmentRepository, session_factory=core.database.provided.session
    )
    appointment_service = providers.Factory(
        AppointmentService, repository=appointment_repository
    )

# di/dependencies/appointment.py
@inject
def get_appointment_service(
    service: AppointmentService = Depends(Provide[Container.appointment.appointment_service]),
) -> AppointmentService:
    return service
```

Wire new containers in `app/di/container.py`.

---

## Error Handling

All errors → FHIR OperationOutcome:
```json
{
    "resourceType": "OperationOutcome",
    "issue": [{"severity": "error", "code": "invalid", "diagnostics": "...", "expression": ["field"]}]
}
```

HTTP status mapping: 400 validation, 401 not authenticated, 403 forbidden, 404 not found, 422 Pydantic body error, 500 unhandled.

---

## Checklist: Adding a New Resource

1. `app/models/<resource>/` — ORM model (internal `id` + public `<resource>_id` via Sequence, `user_id`, `org_id`, audit fields, sub-resource relationships)
2. `app/schemas/<resource>.py` (flat) or `app/schemas/<resource>/` (package) — CreateSchema, PatchSchema (both `extra="forbid"`; Create includes `user_id`/`org_id` in example). Use a package when the resource has recursive sub-schemas (e.g. QuestionnaireResponse with AnswerInput/ItemInput).
3. `app/schemas/fhir/<resource>.py` — FHIR + plain + paginated schemas; export from `fhir/__init__.py`
4. `app/fhir/mappers/<resource>.py` — `to_fhir_<resource>()` + `to_plain_<resource>()`
5. `app/repository/<resource>_repository.py` — full CRUD, `_with_relationships()`, `_apply_list_filters()`, `get_me()` using filter helper
6. `app/services/<resource>_service.py` — `_to_fhir/plain()`, `get_raw_by_id()`, `get_me()`, `list_*()`, `create/patch/delete()`
7. `app/di/modules/<resource>.py` — DI container with repository + service
8. `app/di/dependencies/<resource>.py` — `get_<resource>_service()` FastAPI dependency
9. `app/di/container.py` — wire the new container
10. `app/auth/<resource>_deps.py` — `resolve_<resource>()` resolves model by public ID, raises 404
11. `app/routers/<resource>.py` — routes in order: POST /, GET /me, GET /{id}, PATCH /{id}, GET /, DELETE /{id}; inline `_SINGLE_200/_201/_LIST_200` schema constants
12. `app/routers/__init__.py` — register router with prefix + tag

---

## Running

```bash
uv sync
uv run fastapi dev app/main.py    # dev server with auto-reload
# OR
docker compose up --build          # includes postgres + redis
```

API docs: `http://localhost:8000/docs`
