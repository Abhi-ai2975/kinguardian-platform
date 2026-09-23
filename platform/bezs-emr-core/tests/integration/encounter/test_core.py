"""Integration tests for /api/fhir/v1/encounters endpoints."""
import pytest
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/encounters"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "in-progress",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "completed",
    "actual_period_start": "2024-01-15T09:00:00Z",
    "actual_period_end": "2024-01-15T10:00:00Z",
    "class": [
        {"coding_system": "http://terminology.hl7.org/CodeSystem/v3-ActCode", "coding_code": "AMB", "coding_display": "ambulatory"}
    ],
    "type": [
        {"coding_system": "http://snomed.info/sct", "coding_code": "185349003", "coding_display": "Encounter for check up", "text": "Check up"}
    ],
    "status_history": [
        {"status": "in-progress", "period_start": "2024-01-15T09:00:00Z"}
    ],
    "participant": [
        {"reference": "Practitioner/30001", "reference_display": "Dr. Smith", "period_start": "2024-01-15T09:00:00Z"}
    ],
}


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["status"] == "in-progress"


async def test_create_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "completed"
    assert len(data["class"]) == 1
    assert data["class"][0]["coding_code"] == "AMB"
    assert len(data["type"]) == 1
    assert len(data["status_history"]) == 1
    assert len(data["participant"]) == 1


async def test_create_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "Encounter"
    assert isinstance(data["id"], str)
    assert data["status"] == "completed"
    assert data["class"][0]["coding"][0]["code"] == "AMB"


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_encounter(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == data["id"]


async def test_get_fhir(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    assert r.json()["resourceType"] == "Encounter"


async def test_get_not_found(client):
    assert (await client.get(f"{BASE}/9999999")).status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_encounters(client):
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
        sub="user-a", org_id="org-a", permissions=["encounter:read"]
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_status(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"status": "completed"})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


async def test_patch_not_found(client):
    assert (await client.patch(f"{BASE}/9999999", json={"status": "finished"})).status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_encounter(client):
    data = await _create(client)
    assert (await client.delete(f"{BASE}/{data['id']}")).status_code == 204
    assert (await client.get(f"{BASE}/{data['id']}")).status_code == 404


async def test_delete_not_found(client):
    assert (await client.delete(f"{BASE}/9999999")).status_code == 404


# ── Auth ──────────────────────────────────────────────────────────────────────


async def test_create_requires_permission(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    assert (await client.post(BASE + "/", json=MINIMAL)).status_code in (401, 403)
