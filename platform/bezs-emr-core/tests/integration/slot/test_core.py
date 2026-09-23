"""Integration tests for /api/fhir/v1/slots endpoints."""
import pytest
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/slots"
SCHEDULE_BASE = "/api/fhir/v1/schedules"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}


async def _create_schedule(client) -> int:
    r = await client.post(SCHEDULE_BASE + "/", json={"user_id": "u-test", "org_id": "org-test"})
    assert r.status_code == 200
    return r.json()["id"]


async def _create(client, schedule_id: int | None = None) -> dict:
    if schedule_id is None:
        schedule_id = await _create_schedule(client)
    payload = {
        "user_id": "u-test",
        "org_id": "org-test",
        "schedule": f"Schedule/{schedule_id}",
        "status": "free",
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


async def test_create_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["status"] == "free"


async def test_create_full(client):
    sched_id = await _create_schedule(client)
    payload = {
        "user_id": "u-test",
        "org_id": "org-test",
        "schedule": f"Schedule/{sched_id}",
        "status": "free",
        "start": "2024-06-01T09:00:00Z",
        "end": "2024-06-01T09:30:00Z",
        "overbooked": False,
        "comment": "Morning slot",
        "service_category": [
            {"coding_system": "http://example.org/service-category", "coding_code": "17", "coding_display": "General Practice"}
        ],
    }
    r = await client.post(BASE + "/", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "free"
    assert data["comment"] == "Morning slot"
    assert len(data["service_category"]) == 1
    assert data["service_category"][0]["coding_code"] == "17"


async def test_create_fhir_format(client):
    sched_id = await _create_schedule(client)
    payload = {
        "user_id": "u-test",
        "org_id": "org-test",
        "schedule": f"Schedule/{sched_id}",
        "status": "free",
    }
    r = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "Slot"
    assert data["status"] == "free"


async def test_get_slot(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == data["id"]


async def test_get_fhir(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    assert r.json()["resourceType"] == "Slot"


async def test_get_not_found(client):
    assert (await client.get(f"{BASE}/9999999")).status_code == 404


async def test_list_slots(client):
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
    sched_id = await _create_schedule(client)
    for _ in range(3):
        await _create(client, sched_id)
    r = await client.get(f"{BASE}/?limit=2&offset=0")
    assert r.status_code == 200
    assert len(r.json()["data"]) <= 2


async def test_me_filters_by_user(client):
    sched_a = await _create_schedule(client)
    sched_b = await _create_schedule(client)
    await client.post(BASE + "/", json={"user_id": "user-a", "org_id": "org-a", "schedule": f"Schedule/{sched_a}", "status": "free"})
    await client.post(BASE + "/", json={"user_id": "user-b", "org_id": "org-b", "schedule": f"Schedule/{sched_b}", "status": "free"})
    app.dependency_overrides[get_current_user] = make_test_user(
        sub="user-a", org_id="org-a", permissions=["slot:read"]
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert item["user_id"] == "user-a"


async def test_patch_status(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"status": "busy"})
    assert r.status_code == 200
    assert r.json()["status"] == "busy"


async def test_patch_not_found(client):
    assert (await client.patch(f"{BASE}/9999999", json={"status": "busy"})).status_code == 404


async def test_delete_slot(client):
    data = await _create(client)
    assert (await client.delete(f"{BASE}/{data['id']}")).status_code == 204
    assert (await client.get(f"{BASE}/{data['id']}")).status_code == 404


async def test_delete_not_found(client):
    assert (await client.delete(f"{BASE}/9999999")).status_code == 404


async def test_create_requires_permission(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    sched_id = 200001
    assert (await client.post(BASE + "/", json={"user_id": "u", "org_id": "o", "schedule": f"Schedule/{sched_id}", "status": "free"})).status_code in (401, 403)
