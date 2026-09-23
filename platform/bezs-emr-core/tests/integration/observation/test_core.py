"""Integration tests for /api/fhir/v1/observations endpoints."""
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/observations"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "final",
}

FULL = {
    **MINIMAL,
    "code_system": "http://loinc.org",
    "code_code": "8867-4",
    "code_display": "Heart rate",
    "subject": "Patient/10001",
    "value_quantity_value": 72.0,
    "value_quantity_unit": "beats/minute",
    "category": [
        {"coding_system": "http://terminology.hl7.org/CodeSystem/observation-category", "coding_code": "vital-signs", "coding_display": "Vital Signs"}
    ],
    "note": [{"text": "Normal resting heart rate."}],
}


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_create_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["status"] == "final"


async def test_create_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["code_code"] == "8867-4"
    assert data["subject_type"] == "Patient"
    assert data["subject_id"] == 10001
    assert data["value_quantity_value"] == 72.0
    assert len(data["category"]) == 1
    assert data["category"][0]["coding_code"] == "vital-signs"
    assert len(data["note"]) == 1


async def test_create_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "Observation"
    assert data["status"] == "final"
    assert data["subject"]["reference"] == "Patient/10001"


async def test_get_observation(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == data["id"]


async def test_get_fhir(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    assert r.json()["resourceType"] == "Observation"


async def test_get_not_found(client):
    assert (await client.get(f"{BASE}/9999999")).status_code == 404


async def test_list_observations(client):
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


async def test_me_filters_by_user(client):
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "user-a", "org_id": "org-a"})
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "user-b", "org_id": "org-b"})
    app.dependency_overrides[get_current_user] = make_test_user(
        sub="user-a", org_id="org-a", permissions=["observation:read"]
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert item["user_id"] == "user-a"


async def test_patch_status(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"status": "amended"})
    assert r.status_code == 200
    assert r.json()["status"] == "amended"


async def test_patch_not_found(client):
    assert (await client.patch(f"{BASE}/9999999", json={"status": "cancelled"})).status_code == 404


async def test_delete_observation(client):
    data = await _create(client)
    assert (await client.delete(f"{BASE}/{data['id']}")).status_code == 204
    assert (await client.get(f"{BASE}/{data['id']}")).status_code == 404


async def test_delete_not_found(client):
    assert (await client.delete(f"{BASE}/9999999")).status_code == 404


async def test_create_requires_permission(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    assert (await client.post(BASE + "/", json=MINIMAL)).status_code in (401, 403)
