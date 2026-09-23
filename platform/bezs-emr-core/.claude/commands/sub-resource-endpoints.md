# Sub-Resource Endpoints

Complete pattern for adding GET and DELETE endpoints to any `0..*` child table (names, identifiers, telecom, addresses, photos, contacts, qualifications, communications, etc.).

Every FHIR resource with sub-resource POST endpoints **must** also have GET + DELETE endpoints for each sub-resource. Every route must have `operation_id`, `summary`, `description`, and `responses=` with `inline_schema()`.

---

## Step 1 — Response schemas

Add to `app/schemas/<resource>/response.py` **for each sub-resource** — both plain and FHIR variants:

```python
# ── Plain sub-resource list responses ─────────────────────────────────────────

class <Resource><Sub>ListItem(Plain<Resource><Sub>):
    id: int = Field(..., description="Internal row ID — use for DELETE calls.")

class <Resource><Sub>ListResponse(BaseModel):
    data: List[<Resource><Sub>ListItem]
    total: int = Field(..., description="Total count.")

# ── FHIR sub-resource list responses ─────────────────────────────────────────

class FHIR<Resource><Sub>ListItem(FHIR<Sub>):   # inherit from the corresponding FHIR schema
    id: int = Field(..., description="Internal row ID — use for DELETE calls.")

class FHIR<Resource><Sub>ListResponse(BaseModel):
    data: List[FHIR<Resource><Sub>ListItem]
    total: int = Field(..., description="Total count.")
```

FHIR base schemas to inherit from (all in `app/schemas/common/fhir.py`):
- `FHIRHumanName` → names
- `FHIRIdentifier` → identifiers
- `FHIRContactPoint` → telecom
- `FHIRAddress` → addresses
- `FHIRReference` → references (general practitioners, links `other`)
- Custom FHIR schemas defined in `response.py` (e.g. `FHIRQualification`, `FHIRCommunication`)

Export **both** from:
- `app/schemas/<resource>/__init__.py`
- `app/schemas/fhir/__init__.py`

---

## Step 2 — Repository

Repository `get_<sub>s` methods must return **ORM objects** — not pre-built dicts — so the router can build both FHIR and plain formats:

```python
async def _get_internal(self, session, resource_id: int) -> Optional[<Resource>Model]:
    stmt = select(<Resource>Model).where(<Resource>Model.<resource>_id == resource_id)
    return (await session.execute(stmt)).scalars().first()

async def get_<sub>s(self, resource_id: int) -> list:
    async with self.session_factory() as session:
        parent = await self._get_internal(session, resource_id)
        if not parent:
            return []
        return list((await session.execute(
            select(<Resource><Sub>).where(<Resource><Sub>.<resource>_id == parent.id)
        )).scalars().all())

async def _delete_child(self, session, model_class, child_id: int, parent_internal_id: int) -> bool:
    row = (await session.execute(
        select(model_class).where(model_class.id == child_id)
    )).scalars().first()
    if not row or row.<resource>_id != parent_internal_id:
        return False
    await session.delete(row)
    await session.commit()
    return True

async def delete_<sub>(self, resource_id: int, sub_id: int) -> bool:
    async with self.session_factory() as session:
        parent = await self._get_internal(session, resource_id)
        if not parent:
            return False
        return await self._delete_child(session, <Resource><Sub>, sub_id, parent.id)
```

Rules:
- `_get_internal` fetches the parent without relationships (just needs `parent.id`).
- For sub-resources with grandchildren (e.g. qualification → identifiers) add `selectinload` in `get_<sub>s`.
- `_delete_child` verifies `child.<resource>_id == parent.id` — prevents cross-tenant deletion.
- Return ORM objects, not dicts — the router builds both FHIR and plain from them.

---

## Step 3 — Service

Add thin wrappers to `app/services/<resource>_service.py`:

```python
async def get_<sub>s(self, resource_id: int) -> list:
    return await self.repository.get_<sub>s(resource_id)

async def delete_<sub>(self, resource_id: int, sub_id: int) -> bool:
    return await self.repository.delete_<sub>(resource_id, sub_id)
```

---

## Step 4 — Router

### Module-level imports and constants

```python
from fastapi.responses import JSONResponse
from app.core.content_negotiation import wants_fhir
from app.fhir.datatypes import (
    fhir_human_name, fhir_identifier, fhir_telecom, fhir_address,
    fhir_photo, fhir_communication,
    plain_name, plain_identifier, plain_telecom, plain_address,
    plain_photo, plain_communication,
)
from app.fhir.mappers.<resource> import fhir_<sub>, plain_<sub>  # resource-specific helpers
from app.schemas.fhir import (
    <Resource><Sub>ListResponse,       # plain
    FHIR<Resource><Sub>ListResponse,   # FHIR — repeat for each sub
)

# Separate schemas per content type — NEVER the same schema for both
_SUBRES_<SUB>_200 = {200: {"description": "List of <sub> entries", "content": {
    "application/json": {"schema": inline_schema(<Resource><Sub>ListResponse.model_json_schema())},
    "application/fhir+json": {"schema": inline_schema(FHIR<Resource><Sub>ListResponse.model_json_schema())},
}}}
```

### Helper functions

**Do NOT define local private helpers in the router.** Use imports instead:

- **Standard FHIR types** — import from `app.fhir.datatypes`:
  ```python
  fhir_human_name / plain_name          # HumanName / names child tables
  fhir_identifier / plain_identifier    # Identifier / identifiers child tables
  fhir_telecom    / plain_telecom       # ContactPoint / telecom child tables
  fhir_address    / plain_address       # Address / addresses child tables
  fhir_photo      / plain_photo         # Attachment / photos child tables
  fhir_communication / plain_communication  # Communication / communications child tables
  ```

- **Resource-specific child helpers** (contacts, qualifications, general practitioners, links, etc.) — define in the resource's mapper package (`app/fhir/mappers/<resource>/fhir.py` and `plain.py`), export from its `__init__.py`, and import directly into the router:
  ```python
  from app.fhir.mappers.<resource> import fhir_<sub>, plain_<sub>
  ```

### GET route

```python
@router.get(
    "/{resource_id}/<sub>s",
    dependencies=[Depends(require_permission("<resource>", "read"))],
    operation_id="list_<resource>_<sub>s",
    summary="List all <sub> entries for a <Resource>",
    description=(
        "Returns all <sub> entries attached to this <Resource>. "
        "Each item includes `id` — use it to delete a specific entry via "
        "`DELETE /{resource_id}/<sub>s/{id}`."
    ),
    responses={**_SUBRES_<SUB>_200, **_ERR_AUTH, **_ERR_NOT_FOUND},
)
async def list_<sub>s(
    request: Request,
    resource: <Resource>Model = Depends(resolve_<resource>),
    service: <Resource>Service = Depends(get_<resource>_service),
):
    items = await service.get_<sub>s(resource.<resource>_id)
    plain = [{"id": r.id, **plain_<sub>(r)} for r in items]
    if wants_fhir(request):
        fhir = [{"id": r.id, **fhir_<sub>(r)} for r in items]
        return JSONResponse({"data": fhir, "total": len(fhir)}, media_type="application/fhir+json")
    return JSONResponse({"data": plain, "total": len(plain)})
```

The `**plain_<sub>(r)` / `**fhir_<sub>(r)` pattern unpacks the helper's dict alongside `id`. Zero inline field-by-field construction in the router.

### DELETE route

```python
@router.delete(
    "/{resource_id}/<sub>s/{sub_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("<resource>", "update"))],
    operation_id="delete_<resource>_<sub>",
    summary="Remove a <sub> entry from a <Resource>",
    description=(
        "Permanently deletes a single <sub> entry. "
        "The `sub_id` is the `id` returned by `GET /{resource_id}/<sub>s`. "
        "Returns 404 if the entry does not exist or belongs to a different <Resource>."
    ),
    responses={**_ERR_AUTH, **_ERR_NOT_FOUND},
)
async def delete_<sub>(
    sub_id: int,
    resource: <Resource>Model = Depends(resolve_<resource>),
    service: <Resource>Service = Depends(get_<resource>_service),
):
    deleted = await service.delete_<sub>(resource.<resource>_id, sub_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="<Sub> not found")
    return None
```

---

## Checklist

- [ ] `*ListItem` (inherits plain sub-schema + `id: int`) added to response schema file
- [ ] `*ListResponse` (`data`, `total`) added to response schema file
- [ ] `FHIR*ListItem` (inherits FHIR sub-schema + `id: int`) added to response schema file
- [ ] `FHIR*ListResponse` (`data`, `total`) added to response schema file
- [ ] All four exported from `schemas/<resource>/__init__.py` and `schemas/fhir/__init__.py`
- [ ] Repository: `_get_internal`, `get_<sub>s` (returns ORM objects), `_delete_child`, `delete_<sub>` added
- [ ] Service: `get_<sub>s`, `delete_<sub>` wrappers added
- [ ] Router: `wants_fhir` imported from `app.core.content_negotiation`
- [ ] Router: standard type helpers imported from `app.fhir.datatypes` (name, identifier, telecom, address, photo, communication)
- [ ] Router: resource-specific child helpers imported from `app.fhir.mappers.<resource>`
- [ ] Router: **no** local private `def _fhir_*` or `def _plain_*` functions — zero inline dict construction
- [ ] Router: `_SUBRES_<SUB>_200` uses **separate** schemas for `application/json` vs `application/fhir+json`
- [ ] Router: GET route has `request: Request` parameter
- [ ] Router: GET route uses `[{"id": r.id, **plain_<sub>(r)} for r in items]` and `[{"id": r.id, **fhir_<sub>(r)} for r in items]`
- [ ] Router: GET route sets `media_type="application/fhir+json"` on FHIR JSONResponse
- [ ] Router: DELETE route has `operation_id`, `summary`, `description`, `responses=`
- [ ] `id` is present in every list item — callers need it for DELETE
