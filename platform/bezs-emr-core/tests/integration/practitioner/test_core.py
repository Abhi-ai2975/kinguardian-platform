"""Core practitioner endpoint coverage."""

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user
from tests.helpers.assertions import (
    assert_fhir_bundle,
    assert_fhir_practitioner,
    assert_operation_outcome,
    assert_paginated,
    assert_plain_practitioner,
)
from tests.integration.practitioner.support import BASE, FHIR_ACCEPT, FULL, MINIMAL, create_practitioner


async def test_create_practitioner_minimal(client):
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 200
    assert_plain_practitioner(resp.json(), active=True, gender="female")


async def test_create_practitioner_full(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    assert_plain_practitioner(resp.json(), active=True, gender="male", birth_date="1978-03-15", deceased_boolean=False)


async def test_create_practitioner_returns_fhir_format(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    assert "application/fhir+json" in resp.headers["content-type"]
    assert_fhir_practitioner(resp.json(), active=True, gender="female")


async def test_create_practitioner_extra_field_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "bad_field": "value"})
    assert_operation_outcome(resp.json(), expected_status=400, response_status=resp.status_code)


async def test_get_practitioner_by_id_plain(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.get(f"{BASE}/{practitioner_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == practitioner_id
    assert_plain_practitioner(data, gender="female")


async def test_get_practitioner_by_id_fhir(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.get(f"{BASE}/{practitioner_id}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    assert_fhir_practitioner(resp.json())
    assert resp.json()["id"] == str(practitioner_id)


async def test_get_practitioner_not_found(client):
    resp = await client.get(f"{BASE}/999999")
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)


async def test_patch_practitioner_gender(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.patch(f"{BASE}/{practitioner_id}", json={"gender": "other"})
    assert resp.status_code == 200
    assert resp.json()["gender"] == "other"


async def test_patch_practitioner_birth_date(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.patch(f"{BASE}/{practitioner_id}", json={"birth_date": "1985-03-20"})
    assert resp.status_code == 200
    assert resp.json()["birth_date"] == "1985-03-20"


async def test_patch_practitioner_active_false(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.patch(f"{BASE}/{practitioner_id}", json={"active": False})
    assert resp.status_code == 200
    assert resp.json()["active"] is False


async def test_patch_practitioner_can_clear_nullable_fields(client):
    practitioner_id = await create_practitioner(client, FULL)
    resp = await client.patch(f"{BASE}/{practitioner_id}", json={"birth_date": None, "deceased_boolean": None})
    assert resp.status_code == 200
    data = resp.json()
    assert "birth_date" not in data
    assert "deceased_boolean" not in data


async def test_patch_practitioner_not_found(client):
    resp = await client.patch(f"{BASE}/999999", json={"gender": "male"})
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)


async def test_delete_practitioner(client):
    practitioner_id = await create_practitioner(client)
    resp = await client.delete(f"{BASE}/{practitioner_id}")
    assert resp.status_code == 204
    assert (await client.get(f"{BASE}/{practitioner_id}")).status_code == 404


async def test_delete_practitioner_not_found(client):
    resp = await client.delete(f"{BASE}/999999")
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)


async def test_list_practitioners_plain(client):
    await client.post(BASE + "/", json=MINIMAL)
    await client.post(BASE + "/", json={**FULL, "user_id": "u-test-2"})
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    assert_paginated(resp.json(), min_total=2)


async def test_list_practitioners_fhir_bundle(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert_fhir_bundle(data, min_total=1)
    assert data["entry"][0]["resource"]["resourceType"] == "Practitioner"


async def test_list_practitioners_pagination(client):
    for idx in range(5):
        await client.post(BASE + "/", json={**MINIMAL, "user_id": f"u-test-{idx}"})
    resp = await client.get(BASE + "/?limit=2&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["limit"] == 2
    assert data["offset"] == 0
    assert len(data["data"]) == 2
    assert data["total"] >= 5


async def test_list_practitioners_filter_active(client):
    await client.post(BASE + "/", json={**MINIMAL, "active": True})
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "u-inactive", "active": False})
    resp = await client.get(BASE + "/?active=true")
    assert resp.status_code == 200
    for practitioner in resp.json()["data"]:
        assert practitioner["active"] is True


async def test_list_practitioners_empty(client):
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["data"] == []


async def test_get_my_practitioner_profile_found(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    assert_plain_practitioner(resp.json(), gender="female")


async def test_get_my_practitioner_profile_not_found(client):
    resp = await client.get(BASE + "/me")
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)


async def test_get_my_practitioner_profile_org_isolation(client, other_client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["practitioner:create", "practitioner:read", "practitioner:update", "practitioner:delete"]
    )
    await client.post(BASE + "/", json=MINIMAL)
    app.dependency_overrides[get_current_user] = make_test_user(
        sub="u-other",
        org_id="org-other",
        permissions=["practitioner:create", "practitioner:read", "practitioner:update", "practitioner:delete"],
    )
    try:
        resp = await other_client.get(BASE + "/me")
        assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)
    finally:
        app.dependency_overrides[get_current_user] = make_test_user(
            permissions=["practitioner:create", "practitioner:read", "practitioner:update", "practitioner:delete"]
        )


async def test_create_practitioner_no_permission(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=["practitioner:read"])
    try:
        resp = await client.post(BASE + "/", json=MINIMAL)
        assert_operation_outcome(resp.json(), expected_status=403, response_status=resp.status_code)
    finally:
        app.dependency_overrides[get_current_user] = make_test_user(
            permissions=["practitioner:create", "practitioner:read", "practitioner:update", "practitioner:delete"]
        )


async def test_practitioner_content_negotiation_defaults_to_plain(client):
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 200
    assert "application/json" in resp.headers["content-type"]
    data = resp.json()
    assert "resourceType" not in data
    assert isinstance(data["id"], int)


async def test_practitioner_content_negotiation_fhir_accept(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    assert "application/fhir+json" in resp.headers["content-type"]
    data = resp.json()
    assert data["resourceType"] == "Practitioner"
    assert isinstance(data["id"], str)
