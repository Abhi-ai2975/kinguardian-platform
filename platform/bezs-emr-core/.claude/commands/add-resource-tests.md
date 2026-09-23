# Add Integration Tests for a FHIR Resource

Complete checklist for adding pytest integration tests for any FHIR R4 resource in this server.

The test stack uses **pytest-asyncio** with `asyncio_mode = "auto"`, **httpx AsyncClient**, and **SQLite in-memory** (`StaticPool`). The shared `tests/conftest.py` handles infrastructure; each resource package adds only resource-specific auth overrides, payload helpers, and test modules.

The standard for these tests is **production-grade integration coverage**:
- cover **every endpoint** in the router at least once
- cover the highest-risk negative paths, not every nullable permutation
- add comments and notes so another engineer can understand why the test exists

---

## ARGUMENTS: $RESOURCE

Steps use `$RESOURCE` = the resource name (for example `Patient`, `Claim`). Adjust snake_case paths accordingly.

---

## Before Starting

Read these files first. They determine what the tests must actually assert:

- `app/routers/<resource>.py` - route paths, HTTP methods, query param names, `/me` support
- `app/fhir/mappers/<resource>/plain.py` - exact plain JSON field names
- `app/fhir/mappers/<resource>/fhir.py` - exact FHIR response field names
- `app/schemas/<resource>/input.py` - required fields, patchable fields, nested input shapes
- `app/auth/<resource>_deps.py` - `resolve_<resource>()` resolves by public ID and raises 404 (no ownership check)
- `app/repository/<resource>_repository.py` - runtime list filters, foreign-key resolution, custom reference parsing
- `app/core/content_negotiation.py` - current runtime status behavior may differ from decorator metadata

Do not write tests based on route descriptions alone. Assert the current runtime behavior.

---

## Step 1 - Choose the resource package shape

Do not default to a single `tests/integration/test_<resource>.py` file for production-grade suites. Use a package.

### Pattern A - resources with many child endpoints

Use this for resources like `patient` and `practitioner`.

```text
tests/integration/<resource>/
  conftest.py
  support.py
  test_core.py
  test_<group_1>.py
  test_<group_2>.py
```

Recommended split:
- `conftest.py`: resource-specific permission override only
- `support.py`: `BASE`, `FHIR_ACCEPT`, payloads, tiny create helpers, tiny child-id helpers
- `test_core.py`: create, get by id, patch, delete, list, `/me`, permissions, content negotiation
- other files: grouped child endpoint coverage by route family or response family

Examples already in this repo:
- `tests/integration/patient/`
- `tests/integration/practitioner/`

### Pattern B - resources with complex nested payloads but no child endpoints

Use this for resources like `appointment`.

```text
tests/integration/<resource>/
  conftest.py
  support.py
  test_core.py
  test_nested_fields.py
```

Recommended split:
- `test_core.py`: all top-level endpoints and filter behavior
- `test_nested_fields.py`: representative nested mapper assertions and invalid reference tests

Example already in this repo:
- `tests/integration/appointment/`

Choose the smallest structure that stays readable. Once a file becomes hard to scan, split it.

---

## Step 2 - Add package-level permissions

The shared `client` fixture in `tests/conftest.py` starts with `patient:*` permissions. For any other resource, add `tests/integration/<resource>/conftest.py`:

```python
"""<Resource>-specific auth setup for integration tests."""

import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user


@pytest.fixture(autouse=True)
def _set_<resource>_permissions(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=[
            "<resource>:create",
            "<resource>:read",
            "<resource>:update",
            "<resource>:delete",
        ]
    )
    yield
    app.dependency_overrides[get_current_user] = make_test_user()
```

If payload helpers need prerequisite resources such as patients or practitioners, include those permissions too.

---

## Step 3 - Create `support.py`

`support.py` should carry the small reusable pieces, not full test logic.

Base shape:

```python
"""Shared helpers and payloads for <resource> integration tests."""

BASE = "/api/fhir/v1/<resources>"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}
```

### Prefer payload builders over giant module constants

Use builder functions when:
- the resource needs prerequisite resources created first
- references must be generated dynamically
- the full payload is too large to keep readable as one static dict

Example:

```python
async def build_minimal_payload(client, *, user_id="u-test", org_id="org-test") -> dict:
    return {
        "user_id": user_id,
        "org_id": org_id,
        # ... minimum required fields ...
    }


async def build_full_payload(client, *, user_id="u-test", org_id="org-test") -> dict:
    payload = await build_minimal_payload(client, user_id=user_id, org_id=org_id)
    payload.update(
        {
            # ... representative optional fields that exercise mapping/parsing ...
        }
    )
    return payload
```

### Keep helpers small

```python
async def create_<resource>(client, payload=None) -> int:
    payload = payload or await build_minimal_payload(client)
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    return resp.json()["id"]


async def get_first_child_id(client, path: str) -> int:
    resp = await client.get(path)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    return data["data"][0]["id"]
```

---

## Step 4 - Create `test_core.py`

This file covers the top-level contract.

Suggested header:

```python
"""Core <resource> endpoint coverage."""
```

Suggested imports:

```python
from tests.helpers.assertions import (
    assert_fhir_<resource>,
    assert_fhir_bundle,
    assert_operation_outcome,
    assert_paginated,
    assert_plain_<resource>,
)
```

### Behaviors that `test_core.py` should cover

- minimal create
- rich/full create if the resource has meaningful optional mapping
- FHIR create response
- extra-field rejection
- get by id in plain and FHIR
- get by id not found
- patch of mutable fields
- nullable-field clearing where supported
- patch not found
- delete
- delete not found
- list plain
- list FHIR Bundle
- pagination
- resource-specific filters
- empty list
- `/me` behavior if the router exposes it
- permission failure
- content negotiation defaults

### Create examples

```python
async def test_create_<resource>_minimal(client):
    # Minimal payload proves the smallest supported contract works.
    resp = await client.post(BASE + "/", json=await build_minimal_payload(client))
    assert resp.status_code == 200
    assert_plain_<resource>(resp.json(), ...)


async def test_create_<resource>_full(client):
    # Full payload proves richer optional-field mapping works.
    resp = await client.post(BASE + "/", json=await build_full_payload(client))
    assert resp.status_code == 200
    ...


async def test_create_<resource>_returns_fhir_format(client):
    resp = await client.post(BASE + "/", json=await build_minimal_payload(client), headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    assert resp.json()["resourceType"] == "<Resource>"


async def test_create_<resource>_extra_field_rejected(client):
    payload = await build_minimal_payload(client)
    resp = await client.post(BASE + "/", json={**payload, "bad_field": "value"})
    assert_operation_outcome(resp.json(), expected_status=400, response_status=resp.status_code)
```

### Get by id examples

```python
async def test_get_<resource>_by_id_plain(client):
    resource_id = await create_<resource>(client)
    resp = await client.get(f"{BASE}/{resource_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == resource_id


async def test_get_<resource>_by_id_fhir(client):
    resource_id = await create_<resource>(client)
    resp = await client.get(f"{BASE}/{resource_id}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    assert resp.json()["resourceType"] == "<Resource>"
    assert resp.json()["id"] == str(resource_id)


async def test_get_<resource>_not_found(client):
    resp = await client.get(f"{BASE}/999999")
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)
```

### Authorization and ownership

Only add cross-org negative tests if `app/auth/<resource>_deps.py` actually enforces that scope.

Do not write tests for protections that the current implementation does not provide.

### Patch examples

```python
async def test_patch_<resource>(client):
    resource_id = await create_<resource>(client)
    resp = await client.patch(f"{BASE}/{resource_id}", json={"<field>": "<new_value>"})
    assert resp.status_code == 200
    assert resp.json()["<field>"] == "<new_value>"


async def test_patch_<resource>_not_found(client):
    resp = await client.patch(f"{BASE}/999999", json={"<field>": "x"})
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)
```

### Delete examples

```python
async def test_delete_<resource>(client):
    resource_id = await create_<resource>(client)
    assert (await client.delete(f"{BASE}/{resource_id}")).status_code == 204
    assert (await client.get(f"{BASE}/{resource_id}")).status_code == 404


async def test_delete_<resource>_not_found(client):
    resp = await client.delete(f"{BASE}/999999")
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)
```

### List examples

```python
async def test_list_<resource>s_plain(client):
    await client.post(BASE + "/", json=await build_minimal_payload(client))
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    assert_paginated(resp.json(), min_total=1)


async def test_list_<resource>s_fhir_bundle(client):
    await client.post(BASE + "/", json=await build_minimal_payload(client))
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    assert_fhir_bundle(resp.json(), min_total=1)


async def test_list_<resource>s_pagination(client):
    for idx in range(3):
        await client.post(BASE + "/", json=await build_minimal_payload(client, user_id=f"u-{idx}"))
    resp = await client.get(BASE + "/?limit=2&offset=0")
    data = resp.json()
    assert data["limit"] == 2
    assert len(data["data"]) == 2
    assert data["total"] >= 3


async def test_list_<resource>s_empty(client):
    resp = await client.get(BASE + "/")
    data = resp.json()
    assert data["total"] == 0
    assert data["data"] == []
```

If the router exposes resource-specific filters, add explicit tests for them.

### `/me` examples

Only for resources that actually expose `/me`.

```python
async def test_get_my_<resource>s_found(client):
    await client.post(BASE + "/", json=await build_minimal_payload(client))
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    assert_paginated(resp.json(), min_total=1)


async def test_get_my_<resource>s_org_isolation(client, other_client):
    await client.post(BASE + "/", json=await build_minimal_payload(client))
    resp = await other_client.get(BASE + "/me")
    # Assert current runtime behavior: some resources return 404, some return an empty paginated result.
```

Do not assume all `/me` routes behave the same. Read the repository and auth dependency first.

### Permission example

```python
async def test_create_<resource>_no_permission(client):
    payload = await build_minimal_payload(client)
    from app.main import app as _app
    _app.dependency_overrides[get_current_user] = make_test_user(permissions=["<resource>:read"])
    try:
        resp = await client.post(BASE + "/", json=payload)
        assert_operation_outcome(resp.json(), expected_status=403, response_status=resp.status_code)
    finally:
        _app.dependency_overrides[get_current_user] = make_test_user(
            permissions=["<resource>:create", "<resource>:read", "<resource>:update", "<resource>:delete"]
        )
```

Important:
- build prerequisite payloads before downgrading permissions if the helper needs to create supporting resources
- if the resource depends on patient/practitioner fixtures, include those permissions in the package `conftest.py`

---

## Step 5 - Add either child-route files or `test_nested_fields.py`

### Child-route files

For each `POST /{id}/<subresource>` route family, add tests for all sibling routes:

```python
async def test_add_and_list_<subresource>(client):
    resource_id = await create_<resource>(client)
    payload = {...}
    assert (await client.post(f"{BASE}/{resource_id}/<subresources>", json=payload)).status_code == 200

    list_resp = await client.get(f"{BASE}/{resource_id}/<subresources>")
    assert list_resp.status_code == 200
    data = list_resp.json()
    assert data["total"] == 1
    assert "id" in data["data"][0]


async def test_delete_<subresource>(client):
    resource_id = await create_<resource>(client)
    await client.post(f"{BASE}/{resource_id}/<subresources>", json={...})
    sub_id = (await client.get(f"{BASE}/{resource_id}/<subresources>")).json()["data"][0]["id"]
    assert (await client.delete(f"{BASE}/{resource_id}/<subresources>/{sub_id}")).status_code == 204
```

Do not stop at one or two child endpoints. If the router exposes the route family, test all of it.

Also add at least one FHIR-format list test for each distinct child response shape family:
- HumanName-like
- Identifier-like
- ContactPoint-like
- Address-like
- Attachment-like
- more complex BackboneElement-like entries

### `test_nested_fields.py`

For resources without child routes but with large nested payloads, add a second file such as `test_nested_fields.py`.

That file should:
- verify representative nested fields in the plain mapper
- verify representative nested fields in the FHIR mapper
- test invalid reference formats for open references
- test invalid resource types for closed-set references
- test foreign-key resolution errors
- avoid asserting every nullable field one-by-one

This is the pattern used for `appointment`.

---

## Step 6 - Update `tests/helpers/assertions.py`

Add resource-specific helpers when the generic ones are insufficient:

```python
def assert_plain_<resource>(data: dict, **expected) -> None:
    assert data.get("id") is not None
    for field, value in expected.items():
        assert data.get(field) == value, f"expected {field}={value!r}, got {data.get(field)!r}"


def assert_fhir_<resource>(data: dict, **expected) -> None:
    assert data.get("resourceType") == "<Resource>"
    assert data.get("id") is not None
    for field, value in expected.items():
        assert data.get(field) == value
```

Keep these helpers small. They should assert structure and key scalars, not duplicate whole payloads.

---

## Step 7 - Run and verify

```bash
uv run pytest tests/integration/<resource> -q
uv run pytest tests/ -q
```

Common issues and fixes:

| Symptom | Fix |
|---|---|
| `NotImplementedError: Dialect 'sqlite' does not support sequence increments` | `tests/conftest.py` sequence simulation is not active or app import order changed |
| `429 Too Many Requests` in later tests | `RateLimitMiddleware.dispatch` override is not active |
| `assert 200 == 201` on POST create | `format_response()` currently returns 200 at runtime; if you are not changing `app/`, assert 200 |
| `assert 422 == 400` on validation error | error handling maps schema validation to 400 OperationOutcome; use 400 |
| `404` or empty `/me` after create | payload `user_id` / `org_id` does not match the active fixture, or the resource scopes `/me` differently than you assumed |
| permission test fails before hitting the target route | you downgraded auth before building a payload that creates prerequisite resources |
| nested reference assertion fails | mapper field names differ between plain and FHIR forms; read both mapper files again |

---

## Key invariants

- Assert the current runtime behavior, not just the decorator metadata. Today, `format_response()`-based create endpoints return HTTP **200**.
- Validation errors return HTTP **400** (`OperationOutcome`), not 422, when they are schema-level request validation failures.
- Repository and service-raised invalid reference errors may still return HTTP **422**. Assert the actual runtime path.
- Plain response field names are the mapper contract, not guesses. Read `plain.py`.
- FHIR response field names are the mapper contract, not guesses. Read `fhir.py`.
- Sub-resource list responses are `{"data": [...], "total": N}` and each child item includes `"id"` for delete coverage.
- Minimal payloads used for `/me` tests must resolve to `"user_id": "u-test"` and `"org_id": "org-test"` unless the route is explicitly designed otherwise.
- `other_client` shares the same database as `client`; use it for isolation checks.
- Do not stop at status-code checks for errors. Assert the `OperationOutcome` shape too.
- Production-grade does **not** mean testing every nullable field one-by-one. It means endpoint-complete coverage plus focused tests for all custom logic and risky mappings.
- Add comments. The test files should explain intent, not just assert values.
- Prefer package-per-resource structure. The repo now uses:
  - `patient/` for many child routes
  - `practitioner/` for many child routes
  - `appointment/` for nested payload coverage without child routes
