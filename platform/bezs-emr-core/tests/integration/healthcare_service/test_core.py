"""Integration tests for /api/fhir/v1/healthcare-services endpoints."""
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/healthcare-services"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
}

FULL = {
    **MINIMAL,
    "name": "Cardiology Services",
    "active": True,
    "comment": "Specializing in cardiac care",
    "category": [
        {"coding_system": "http://example.org/service-category", "coding_code": "8", "coding_display": "Counselling"}
    ],
    "type": [
        {"coding_system": "http://snomed.info/sct", "coding_code": "394579002", "coding_display": "Cardiology"}
    ],
    "specialty": [
        {"coding_system": "http://snomed.info/sct", "coding_code": "394579002", "coding_display": "Cardiology"}
    ],
}


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_create_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)


async def test_create_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == "Cardiology Services"
    assert data["active"] is True
    assert len(data["category"]) == 1
    assert data["category"][0]["coding_code"] == "8"
    assert len(data["type"]) == 1
    assert len(data["specialty"]) == 1


async def test_create_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "HealthcareService"
    assert isinstance(data["id"], str)
    assert data["name"] == "Cardiology Services"


async def test_get_healthcare_service(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == data["id"]


async def test_get_fhir(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    assert r.json()["resourceType"] == "HealthcareService"


async def test_get_not_found(client):
    assert (await client.get(f"{BASE}/9999999")).status_code == 404


async def test_list_healthcare_services(client):
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
        sub="user-a", org_id="org-a", permissions=["healthcare_service:read"]
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert item["user_id"] == "user-a"


async def test_patch_name(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"name": "Updated Services"})
    assert r.status_code == 200
    assert r.json()["name"] == "Updated Services"


async def test_patch_active(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"active": False})
    assert r.status_code == 200
    assert r.json()["active"] is False


async def test_patch_not_found(client):
    assert (await client.patch(f"{BASE}/9999999", json={"active": False})).status_code == 404


async def test_delete_healthcare_service(client):
    data = await _create(client)
    assert (await client.delete(f"{BASE}/{data['id']}")).status_code == 204
    assert (await client.get(f"{BASE}/{data['id']}")).status_code == 404


async def test_delete_not_found(client):
    assert (await client.delete(f"{BASE}/9999999")).status_code == 404


async def test_create_requires_permission(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    assert (await client.post(BASE + "/", json=MINIMAL)).status_code in (401, 403)
