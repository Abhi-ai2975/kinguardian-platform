"""Integration tests for /api/v1/vitals endpoints."""
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/v1/vitals"

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
}

FULL = {
    **MINIMAL,
    "steps": 8000,
    "calories_kcal": 2100.0,
    "distance_meters": 5000.0,
    "total_active_minutes": 40,
    "resting_heart_rate": 68,
    "heart_rate": 72,
    "sleep_minutes": 480,
    "weight_kg": 70.0,
    "height_cm": 175.0,
}


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)


async def test_create_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["steps"] == 8000
    assert data["resting_heart_rate"] == 68
    assert data["weight_kg"] == 70.0


async def test_get_vitals(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == data["id"]


async def test_get_not_found(client):
    assert (await client.get(f"{BASE}/9999999")).status_code == 404


async def test_list_vitals(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    assert r.json()["total"] >= 1


async def test_list_pagination(client):
    for _ in range(3):
        await _create(client)
    r = await client.get(f"{BASE}/?limit=2&offset=0")
    assert r.status_code == 200
    assert len(r.json()["data"]) <= 2


async def test_me_filters_by_user(client):
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "user-a", "org_id": "org-a"})
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "user-b", "org_id": "org-b"})
    app.dependency_overrides[get_current_user] = make_test_user(sub="user-a", org_id="org-a")
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert item["user_id"] == "user-a"


async def test_patch_steps(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"steps": 10000})
    assert r.status_code == 200
    assert r.json()["steps"] == 10000


async def test_patch_not_found(client):
    assert (await client.patch(f"{BASE}/9999999", json={"steps": 100})).status_code == 404


async def test_delete_vitals(client):
    data = await _create(client)
    assert (await client.delete(f"{BASE}/{data['id']}")).status_code == 204
    assert (await client.get(f"{BASE}/{data['id']}")).status_code == 404


async def test_delete_not_found(client):
    assert (await client.delete(f"{BASE}/9999999")).status_code == 404
