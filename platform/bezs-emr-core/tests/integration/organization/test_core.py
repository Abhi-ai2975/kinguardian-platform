"""Integration tests for /api/fhir/v1/organizations endpoints."""
import pytest
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/organizations"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "name": "Test Hospital",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "active": True,
    "name": "General Hospital",
    "type": [
        {"coding_system": "http://terminology.hl7.org/CodeSystem/organization-type", "coding_code": "prov", "coding_display": "Healthcare Provider"}
    ],
    "alias": [{"value": "Gen Hosp"}],
    "telecom": [{"system": "phone", "value": "555-1234", "use": "work"}],
    "address": [
        {"use": "work", "type": "both", "line": ["123 Main St"], "city": "Anytown", "state": "CA", "postal_code": "12345", "country": "US"}
    ],
    "contact": [
        {
            "purpose_code": "ADMIN",
            "purpose_system": "http://terminology.hl7.org/CodeSystem/contactentity-type",
            "name_family": "Smith",
            "name_given": ["John"],
            "telecom": [{"system": "phone", "value": "555-0001"}],
        }
    ],
    "endpoint": [],
}


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["name"] == "Test Hospital"


async def test_create_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == "General Hospital"
    assert data["active"] is True
    assert len(data["type"]) == 1
    assert data["type"][0]["coding_code"] == "prov"
    assert len(data["alias"]) == 1
    assert len(data["telecom"]) == 1
    assert len(data["address"]) == 1
    assert len(data["contact"]) == 1


async def test_create_fhir_format(client):
    r = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "Organization"
    assert isinstance(data["id"], str)
    assert data["name"] == "Test Hospital"


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_organization(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == data["id"]


async def test_get_fhir(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    assert r.json()["resourceType"] == "Organization"


async def test_get_not_found(client):
    assert (await client.get(f"{BASE}/9999999")).status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_organizations(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    assert r.json()["total"] >= 1


async def test_list_fhir(client):
    await _create(client)
    r = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    assert r.json()["resourceType"] == "Bundle"


async def test_list_pagination(client):
    for _ in range(3):
        await _create(client)
    r = await client.get(f"{BASE}/?limit=2&offset=0")
    assert r.status_code == 200
    assert len(r.json()["data"]) <= 2


# ── /me ───────────────────────────────────────────────────────────────────────


async def test_me_filters_by_user(client):
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "user-a", "org_id": "org-a"})
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "user-b", "org_id": "org-b"})
    app.dependency_overrides[get_current_user] = make_test_user(
        sub="user-a", org_id="org-a", permissions=["organization:read"]
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_name(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"name": "Updated Hospital"})
    assert r.status_code == 200
    assert r.json()["name"] == "Updated Hospital"


async def test_patch_active(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"active": False})
    assert r.status_code == 200
    assert r.json()["active"] is False


async def test_patch_not_found(client):
    assert (await client.patch(f"{BASE}/9999999", json={"name": "X"})).status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_organization(client):
    data = await _create(client)
    assert (await client.delete(f"{BASE}/{data['id']}")).status_code == 204
    assert (await client.get(f"{BASE}/{data['id']}")).status_code == 404


async def test_delete_not_found(client):
    assert (await client.delete(f"{BASE}/9999999")).status_code == 404


# ── Auth ──────────────────────────────────────────────────────────────────────


async def test_create_requires_permission(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    assert (await client.post(BASE + "/", json=MINIMAL)).status_code in (401, 403)
