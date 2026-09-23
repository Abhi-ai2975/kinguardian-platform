"""Integration tests for /api/fhir/v1/related-persons endpoints."""
import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/related-persons"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "active": True,
    "patient": "Patient/10001",
    "patient_display": "John Doe",
    "gender": "male",
    "birth_date": "1980-05-15",
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2025-01-01T00:00:00Z",
    "relationships": [
        {
            "coding_system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
            "coding_code": "MTH",
            "coding_display": "mother",
            "text": "Mother",
        }
    ],
    "names": [
        {
            "use": "official",
            "family": "Smith",
            "given": ["Jane"],
            "prefix": ["Mrs."],
            "suffix": ["Jr."],
            "period_start": "2020-01-01T00:00:00Z",
        }
    ],
    "telecoms": [
        {"system": "phone", "value": "+1-555-1234", "use": "home", "rank": 1}
    ],
    "addresses": [
        {
            "use": "home",
            "type": "physical",
            "line": ["123 Main St"],
            "city": "Springfield",
            "state": "IL",
            "postal_code": "62701",
            "country": "US",
        }
    ],
    "photos": [
        {
            "content_type": "image/png",
            "url": "https://example.org/photo.png",
            "title": "Profile photo",
        }
    ],
    "identifiers": [
        {
            "use": "official",
            "system": "http://hospital.org/mrn",
            "value": "MRN-67890",
        }
    ],
    "communications": [
        {
            "language_code": "en",
            "language_display": "English",
            "preferred": True,
        }
    ],
}


# ── Helper ────────────────────────────────────────────────────────────────────


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_related_person_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)


async def test_create_related_person_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["active"] is True
    assert data["patient_type"] == "Patient"
    assert data["patient_id"] == 10001
    assert data["patient_display"] == "John Doe"
    assert data["gender"] == "male"
    assert data["birth_date"] == "1980-05-15"
    assert len(data["relationships"]) == 1
    assert data["relationships"][0]["coding_code"] == "MTH"
    assert len(data["names"]) == 1
    assert data["names"][0]["family"] == "Smith"
    assert data["names"][0]["given"] == ["Jane"]
    assert data["names"][0]["prefix"] == ["Mrs."]
    assert len(data["telecoms"]) == 1
    assert data["telecoms"][0]["value"] == "+1-555-1234"
    assert len(data["addresses"]) == 1
    assert data["addresses"][0]["city"] == "Springfield"
    assert len(data["photos"]) == 1
    assert data["photos"][0]["url"] == "https://example.org/photo.png"
    assert len(data["identifiers"]) == 1
    assert data["identifiers"][0]["value"] == "MRN-67890"
    assert len(data["communications"]) == 1
    assert data["communications"][0]["preferred"] is True


async def test_create_related_person_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "RelatedPerson"
    assert isinstance(data["id"], str)
    assert data["active"] is True
    assert data["patient"]["reference"] == "Patient/10001"
    assert data["patient"]["display"] == "John Doe"
    assert data["gender"] == "male"
    assert data["birthDate"] == "1980-05-15"
    assert len(data["relationship"]) == 1
    rel = data["relationship"][0]
    assert rel["coding"][0]["code"] == "MTH"
    assert len(data["name"]) == 1
    assert data["name"][0]["family"] == "Smith"
    assert len(data["telecom"]) == 1
    assert len(data["address"]) == 1
    assert len(data["photo"]) == 1
    assert len(data["identifier"]) == 1
    assert len(data["communication"]) == 1
    assert "period" in data


async def test_create_related_person_invalid_patient_ref(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "patient": "NotAPatient/123"})
    assert r.status_code == 422


async def test_create_related_person_invalid_patient_format(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "patient": "bad-format"})
    assert r.status_code == 422


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_related_person(client):
    data = await _create(client)
    rp_id = data["id"]
    r = await client.get(f"{BASE}/{rp_id}")
    assert r.status_code == 200
    assert r.json()["id"] == rp_id


async def test_get_related_person_fhir(client):
    data = await _create(client)
    rp_id = data["id"]
    r = await client.get(f"{BASE}/{rp_id}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    d = r.json()
    assert d["resourceType"] == "RelatedPerson"
    assert d["id"] == str(rp_id)


async def test_get_related_person_not_found(client):
    r = await client.get(f"{BASE}/9999999")
    assert r.status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_related_persons(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "data" in data
    assert data["total"] >= 1


async def test_list_related_persons_fhir(client):
    await _create(client)
    r = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    data = r.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "searchset"


async def test_list_pagination(client):
    for _ in range(3):
        await _create(client)
    r = await client.get(f"{BASE}/?limit=2&offset=0")
    assert r.status_code == 200
    data = r.json()
    assert len(data["data"]) <= 2
    assert data["limit"] == 2
    assert data["offset"] == 0


# ── /me ───────────────────────────────────────────────────────────────────────


async def test_me_returns_only_user_records(client):
    user_a = {**MINIMAL, "user_id": "user-a", "org_id": "org-a"}
    user_b = {**MINIMAL, "user_id": "user-b", "org_id": "org-b"}

    await client.post(BASE + "/", json=user_a)
    await client.post(BASE + "/", json=user_b)

    app.dependency_overrides[get_current_user] = make_test_user(
        sub="user-a",
        org_id="org-a",
        permissions=["related_person:read"],
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    data = r.json()
    for item in data["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_related_person_active(client):
    data = await _create(client)
    rp_id = data["id"]
    r = await client.patch(f"{BASE}/{rp_id}", json={"active": False})
    assert r.status_code == 200
    assert r.json()["active"] is False


async def test_patch_related_person_gender(client):
    data = await _create(client)
    rp_id = data["id"]
    r = await client.patch(f"{BASE}/{rp_id}", json={"gender": "female"})
    assert r.status_code == 200
    assert r.json()["gender"] == "female"


async def test_patch_related_person_names(client):
    data = await _create(client)
    rp_id = data["id"]
    r = await client.patch(f"{BASE}/{rp_id}", json={
        "names": [{"use": "nickname", "text": "Jimmy"}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["names"]) == 1
    assert d["names"][0]["text"] == "Jimmy"


async def test_patch_related_person_telecoms(client):
    data = await _create(client)
    rp_id = data["id"]
    r = await client.patch(f"{BASE}/{rp_id}", json={
        "telecoms": [{"system": "email", "value": "test@example.com"}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["telecoms"]) == 1
    assert d["telecoms"][0]["value"] == "test@example.com"


async def test_patch_related_person_not_found(client):
    r = await client.patch(f"{BASE}/9999999", json={"active": True})
    assert r.status_code == 404


async def test_patch_related_person_invalid_gender(client):
    data = await _create(client)
    rp_id = data["id"]
    r = await client.patch(f"{BASE}/{rp_id}", json={"gender": "not-a-gender"})
    assert r.status_code in (400, 422)


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_related_person(client):
    data = await _create(client)
    rp_id = data["id"]
    r = await client.delete(f"{BASE}/{rp_id}")
    assert r.status_code == 204
    r2 = await client.get(f"{BASE}/{rp_id}")
    assert r2.status_code == 404


async def test_delete_related_person_not_found(client):
    r = await client.delete(f"{BASE}/9999999")
    assert r.status_code == 404


# ── Auth / Permissions ────────────────────────────────────────────────────────


async def test_create_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.post(BASE + "/", json=MINIMAL)
    assert r.status_code in (401, 403)


async def test_read_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["related_person:create", "related_person:read", "related_person:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    rp_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.get(f"{BASE}/{rp_id}")
    assert r.status_code in (401, 403)


async def test_delete_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["related_person:create", "related_person:read", "related_person:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    rp_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.delete(f"{BASE}/{rp_id}")
    assert r.status_code in (401, 403)
