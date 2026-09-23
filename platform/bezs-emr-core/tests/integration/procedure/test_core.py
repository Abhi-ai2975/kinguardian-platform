"""Integration tests for /api/fhir/v1/procedures endpoints."""
import pytest
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/procedures"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "completed",
    "subject": "Patient/10001",
}

FULL = {
    **MINIMAL,
    "subject_display": "John Doe",
    "code_system": "http://snomed.info/sct",
    "code_code": "80146002",
    "code_display": "Appendectomy",
    "performed_datetime": "2024-01-15T10:00:00Z",
    "category_system": "http://snomed.info/sct",
    "category_code": "387713003",
    "category_display": "Surgical procedure",
    "performer": [
        {"actor": "Practitioner/30001", "actor_display": "Dr. Smith"}
    ],
    "note": [{"text": "Procedure completed without complications."}],
    "reason_code": [
        {"coding_system": "http://snomed.info/sct", "coding_code": "74400008", "coding_display": "Appendicitis"}
    ],
}


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_create_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["status"] == "completed"


async def test_create_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["code_code"] == "80146002"
    assert data["subject_type"] == "Patient"
    assert data["subject_id"] == 10001
    assert len(data["performer"]) == 1
    assert len(data["note"]) == 1
    assert len(data["reason_code"]) == 1


async def test_create_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "Procedure"
    assert data["status"] == "completed"
    assert data["subject"]["reference"] == "Patient/10001"


async def test_get_procedure(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == data["id"]


async def test_get_not_found(client):
    assert (await client.get(f"{BASE}/9999999")).status_code == 404


async def test_list_procedures(client):
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
    assert len(r.json()["data"]) <= 2


async def test_me_filters(client):
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "user-a", "org_id": "org-a"})
    app.dependency_overrides[get_current_user] = make_test_user(
        sub="user-a", org_id="org-a", permissions=["procedure:read"]
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert item["user_id"] == "user-a"


async def test_patch_status(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"status": "not-done"})
    assert r.status_code == 200
    assert r.json()["status"] == "not-done"


async def test_patch_not_found(client):
    assert (await client.patch(f"{BASE}/9999999", json={"status": "stopped"})).status_code == 404


async def test_delete_procedure(client):
    data = await _create(client)
    assert (await client.delete(f"{BASE}/{data['id']}")).status_code == 204
    assert (await client.get(f"{BASE}/{data['id']}")).status_code == 404


async def test_delete_not_found(client):
    assert (await client.delete(f"{BASE}/9999999")).status_code == 404


async def test_create_requires_permission(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    assert (await client.post(BASE + "/", json=MINIMAL)).status_code in (401, 403)
