# Add a New FHIR Resource

Complete step-by-step checklist for adding a new FHIR R4 resource to this server.

**Before starting:** run `/fhir-db-model` with the R4 spec URL to design the ORM model, enums, and migration first.

## ARGUMENTS: $RESOURCE

Steps use `$RESOURCE` = the resource name (e.g. `Observation`, `Claim`). Adjust paths accordingly.

---

## Checklist

1. **Model** — `app/models/<resource>/<resource>.py`
   - Internal `id` PK + public `<resource>_id` via Sequence (next available block from CLAUDE.md)
   - Standard columns: `user_id`, `org_id`, `created_by`, `updated_by`, `created_at`, `updated_at`
   - Child tables with `cascade="all, delete-orphan"` on parent side

2. **Enums** — `app/models/<resource>/enums.py`

3. **`__init__.py`** — `app/models/<resource>/__init__.py` — export all model classes

4. **Register in migrations** — add `import app.models.<resource>.<resource>  # noqa: F401` to `migrations/env.py`

5. **Migration** — `uv run alembic revision --autogenerate -m "add_<resource>_tables"` then manually fix:
   - Autogenerate emits `sa.Enum('VALUE1', ...)` using Python member names — **keep those values as-is**. For reference type enums they are `UPPERCASE_SNAKE` (e.g. `'PRACTITIONER_ROLE'`); for status enums they are `lowercase`. Both are correct — never change them to TitleCase.
   - Replace `sa.Enum(...)` with module-level `postgresql.ENUM('VALUE1', ..., name='pg_type_name')` + `.create(bind, checkfirst=True)` in `upgrade()`
   - Add `op.execute("CREATE SEQUENCE IF NOT EXISTS <resource>_id_seq START WITH <N> INCREMENT BY 1")`
   - `organization_reference_type` — always `create_type=False`, never create/drop (shared type)
   - `downgrade()`: drop tables in reverse FK order, drop sequence, drop new enum types (not shared ones)
   - Apply: `uv run alembic upgrade head`

6. **Input Schemas** — `app/schemas/<resource>/input.py` (or flat file for simple resources)
   - `<Resource>CreateSchema` — `extra="forbid"`, `json_schema_extra` with complete example including `user_id`, `org_id`
   - `<Resource>PatchSchema` — all optional; exclude immutable fields

7. **FHIR Response Schemas** — `app/schemas/fhir/<resource>.py`
   - `FHIR<Resource>Schema` (camelCase + `resourceType`)
   - `Plain<Resource>Response` (snake_case)
   - `Paginated<Resource>Response` (wraps plain with `total`, `limit`, `offset`, `data[]`)
   - `FHIR<Resource>Bundle` (FHIR Bundle with `entry[]`)
   - Export from `app/schemas/fhir/__init__.py`

8. **Mapper** — `app/fhir/mappers/<resource>/` package
   - `fhir.py` — per-child-model FHIR builder functions + `to_fhir_<resource>()` orchestrator
     - Import shared types from `app.fhir.datatypes`: `fhir_human_name`, `fhir_identifier`, `fhir_telecom`, `fhir_address`, `fhir_photo`, `fhir_communication`, `fhir_enum`, `fhir_split`
     - `to_fhir_<resource>`: `"id": str(model.<resource>_id)`, strip None at end
   - `plain.py` — per-child-model plain/snake_case builder functions + `to_plain_<resource>()` orchestrator
     - Import shared types from `app.fhir.datatypes`: `plain_name`, `plain_identifier`, `plain_telecom`, `plain_address`, `plain_photo`, `plain_communication`, `fhir_enum`, `fhir_split`
     - `to_plain_<resource>`: `"id": model.<resource>_id` as int
   - `__init__.py` — re-export all public functions from both `fhir.py` and `plain.py`
   - Any child-model helper exported from `__init__.py` is also imported directly by the router's sub-resource GET routes (zero inline dicts in router)

9. **Repository** — `app/repository/<resource>_repository.py`
   - `_with_relationships(stmt)` — `selectinload` for every child relationship
   - `_apply_list_filters(stmt, user_id, org_id, ...)` — conditional WHERE clauses
   - Methods: `get_by_<resource>_id()`, `get_me()`, `list()`, `create()`, `patch()`, `delete()`
   - `get_me()` calls `_apply_list_filters()` with `user_id`/`org_id` always set
   - Session-per-operation: `async with self.session_factory() as session:`

10. **Service** — `app/services/<resource>_service.py`
    - `_to_fhir(model)` and `_to_plain(model)` wrappers around the mapper
    - `get_raw_by_<resource>_id()` — for auth dep (no relationships needed)
    - `get_me()`, `list_<resource>s()`, `create_<resource>()`, `patch_<resource>()`, `delete_<resource>()`

11. **DI Module** — `app/di/modules/<resource>.py`
    ```python
    class <Resource>Container(containers.DeclarativeContainer):
        core = providers.DependenciesContainer()
        <resource>_repository = providers.Factory(<Resource>Repository, session_factory=core.database.provided.session)
        <resource>_service = providers.Factory(<Resource>Service, repository=<resource>_repository)
    ```

12. **DI Dependency** — `app/di/dependencies/<resource>.py`
    ```python
    @inject
    def get_<resource>_service(
        service: <Resource>Service = Depends(Provide[Container.<resource>.<resource>_service]),
    ) -> <Resource>Service:
        return service
    ```

13. **Wire container** — `app/di/container.py`
    - `<resource> = providers.Container(<Resource>Container, core=core)`

14. **Auth dep** — `app/auth/<resource>_deps.py`
    - `resolve_<resource>()` — loads model by public ID, raises 404 if not found (no ownership check)

15. **Router** — `app/routers/<resource>.py`
    - Module-level constants: `_SINGLE_200`, `_SINGLE_201`, `_LIST_200` using `inline_schema()`
    - Route order: `POST /`, `GET /me`, `GET /{id}`, `PATCH /{id}`, `GET /`, `DELETE /{id}`
    - `/me` **must** come before `/{id}` to prevent FastAPI treating `me` as a path param
    - Use `require_permission("<resource>", "create|read|update|delete")` as dependency
    - If `status` is a query param, rename to `<res>_status` with `alias="status"` to avoid shadowing `fastapi.status`
    - Never use `response_model=` — use inline `responses=` with `inline_schema()` only
    - **Sub-resource GET + DELETE routes** (for every `0..*` child table — names, identifiers, telecom, etc.):
      - Add `<Resource><Sub>ListItem` (plain sub-schema + `id: int`) and `<Resource><Sub>ListResponse` to `response.py`, export from both `__init__.py` and `fhir/__init__.py`
      - Add module-level `_SUBRES_<SUB>_200` constant using `inline_schema()` — `application/json` only (no `application/fhir+json`)
      - `GET /{resource_id}/<sub>` → `JSONResponse({"data": [...with id...], "total": N})`
      - `DELETE /{resource_id}/<sub>/{id}` → 204 No Content; repository verifies `child.<resource>_id == parent.id` before deleting
      - See CLAUDE.md "Sub-Resource GET + DELETE Endpoints" for the full pattern

16. **Register router** — `app/routers/__init__.py`
    - `api_router.include_router(<resource>_router, prefix="/<resources>", tags=["<Resources>"])`

17. **Update CLAUDE.md** — add the new resource to the sequence allocation table

## Verify

```bash
uv run python -c "from app.models.<resource> import *; print('OK')"
uv run fastapi dev app/main.py
# Check http://localhost:8000/openapi.json — confirm all fields in request + response schemas
```
