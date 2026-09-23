"""Integration tests for /api/fhir/v1/episode-of-cares endpoints."""
import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/episode-of-cares"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "active",
    "patient": "Patient/10001",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "active",
    "patient": "Patient/10001",
    "patient_display": "John Doe",
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2024-12-31T23:59:59Z",
    "care_manager": "Practitioner/30001",
    "care_manager_display": "Dr. Smith",
    "identifiers": [
        {
            "system": "http://example.org/eoc",
            "value": "EOC-001",
            "use": "official",
        }
    ],
    "status_history": [
        {
            "status": "planned",
            "period_start": "2023-12-01T00:00:00Z",
            "period_end": "2024-01-01T00:00:00Z",
        }
    ],
    "types": [
        {
            "coding_system": "http://snomed.info/sct",
            "coding_code": "394602003",
            "coding_display": "Rehabilitation",
            "text": "Rehab care",
        }
    ],
    "diagnoses": [
        {
            "condition": "Condition/120001",
            "condition_display": "Diabetes",
            "role_system": "http://terminology.hl7.org/CodeSystem/diagnosis-role",
            "role_code": "CC",
            "role_display": "Chief complaint",
            "rank": 1,
        }
    ],
    "referral_requests": [
        {
            "reference": "ServiceRequest/80001",
            "reference_display": "Referral for rehab",
        }
    ],
    "team": [],
    "accounts": [],
}


# ── Helper ────────────────────────────────────────────────────────────────────


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["status"] == "active"
    assert data["patient_type"] == "Patient"
    assert data["patient_id"] == 10001


async def test_create_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()

    assert data["status"] == "active"
    assert data["patient_type"] == "Patient"
    assert data["patient_id"] == 10001
    assert data["patient_display"] == "John Doe"
    assert data["care_manager_type"] == "Practitioner"
    assert data["care_manager_id"] == 30001
    assert data["care_manager_display"] == "Dr. Smith"
    assert data["period_start"] is not None
    assert data["period_end"] is not None

    assert len(data["identifiers"]) == 1
    assert data["identifiers"][0]["system"] == "http://example.org/eoc"
    assert data["identifiers"][0]["value"] == "EOC-001"

    assert len(data["status_history"]) == 1
    assert data["status_history"][0]["status"] == "planned"

    assert len(data["types"]) == 1
    assert data["types"][0]["coding_code"] == "394602003"
    assert data["types"][0]["text"] == "Rehab care"

    assert len(data["diagnoses"]) == 1
    diag = data["diagnoses"][0]
    assert diag["reference_type"] == "Condition"
    assert diag["reference_id"] == 120001
    assert diag["reference_display"] == "Diabetes"
    assert diag["role_code"] == "CC"
    assert diag["rank"] == 1

    assert len(data["referral_requests"]) == 1
    rr = data["referral_requests"][0]
    assert rr["reference_type"] == "ServiceRequest"
    assert rr["reference_id"] == 80001


async def test_create_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "EpisodeOfCare"
    assert isinstance(data["id"], str)
    assert data["status"] == "active"
    assert data["patient"]["reference"] == "Patient/10001"
    assert data["careManager"]["reference"] == "Practitioner/30001"
    assert "period" in data
    assert len(data["identifier"]) == 1
    assert len(data["statusHistory"]) == 1
    assert data["statusHistory"][0]["status"] == "planned"
    assert len(data["type"]) == 1
    assert len(data["diagnosis"]) == 1
    assert data["diagnosis"][0]["condition"]["reference"] == "Condition/120001"
    assert data["diagnosis"][0]["rank"] == 1
    assert len(data["referralRequest"]) == 1
    assert data["referralRequest"][0]["reference"] == "ServiceRequest/80001"


async def test_create_with_care_team(client):
    payload = {**MINIMAL, "team": [{"reference": "CareTeam/1", "reference_display": "Primary Team"}]}
    r = await client.post(BASE + "/", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["team"]) == 1
    assert data["team"][0]["reference_type"] == "CareTeam"
    assert data["team"][0]["reference_id"] == 1


async def test_create_with_account(client):
    payload = {**MINIMAL, "accounts": [{"reference": "Account/1"}]}
    r = await client.post(BASE + "/", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["accounts"]) == 1
    assert data["accounts"][0]["reference_type"] == "Account"
    assert data["accounts"][0]["reference_id"] == 1


async def test_create_invalid_patient_type(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "patient": "BadType/999"})
    assert r.status_code == 422


async def test_create_invalid_care_manager_type(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "care_manager": "BadType/999"})
    assert r.status_code == 422


async def test_create_invalid_diagnosis_type(client):
    payload = {**MINIMAL, "diagnoses": [{"condition": "BadType/999"}]}
    r = await client.post(BASE + "/", json=payload)
    assert r.status_code == 422


async def test_create_invalid_referral_request_type(client):
    payload = {**MINIMAL, "referral_requests": [{"reference": "BadType/999"}]}
    r = await client.post(BASE + "/", json=payload)
    assert r.status_code == 422


async def test_create_with_practitioner_role_care_manager(client):
    payload = {**MINIMAL, "care_manager": "PractitionerRole/140001"}
    r = await client.post(BASE + "/", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["care_manager_type"] == "PractitionerRole"
    assert data["care_manager_id"] == 140001


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_episode_of_care(client):
    data = await _create(client)
    eoc_id = data["id"]
    r = await client.get(f"{BASE}/{eoc_id}")
    assert r.status_code == 200
    assert r.json()["id"] == eoc_id


async def test_get_episode_of_care_fhir(client):
    data = await _create(client)
    eoc_id = data["id"]
    r = await client.get(f"{BASE}/{eoc_id}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    d = r.json()
    assert d["resourceType"] == "EpisodeOfCare"
    assert d["id"] == str(eoc_id)


async def test_get_not_found(client):
    r = await client.get(f"{BASE}/9999999")
    assert r.status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_episode_of_cares(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "data" in data
    assert data["total"] >= 1


async def test_list_fhir_format(client):
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


async def test_list_filter_by_status(client):
    await _create(client, {**MINIMAL, "status": "active"})
    await _create(client, {**MINIMAL, "status": "finished"})
    r = await client.get(f"{BASE}/?status=active")
    assert r.status_code == 200
    data = r.json()
    for item in data["data"]:
        assert item["status"] == "active"


async def test_list_filter_by_patient_id(client):
    await _create(client, {**MINIMAL, "patient": "Patient/10001"})
    await _create(client, {**MINIMAL, "patient": "Patient/10002"})
    r = await client.get(f"{BASE}/?patient_id=10001")
    assert r.status_code == 200
    data = r.json()
    for item in data["data"]:
        assert item["patient_id"] == 10001


# ── /me ───────────────────────────────────────────────────────────────────────


async def test_me_returns_only_user_records(client):
    user_a = {**MINIMAL, "user_id": "user-a", "org_id": "org-a"}
    user_b = {**MINIMAL, "user_id": "user-b", "org_id": "org-b"}

    await client.post(BASE + "/", json=user_a)
    await client.post(BASE + "/", json=user_b)

    app.dependency_overrides[get_current_user] = make_test_user(
        sub="user-a",
        org_id="org-a",
        permissions=["episode_of_care:read"],
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    data = r.json()
    for item in data["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_status(client):
    data = await _create(client)
    eoc_id = data["id"]
    r = await client.patch(f"{BASE}/{eoc_id}", json={"status": "finished"})
    assert r.status_code == 200
    assert r.json()["status"] == "finished"


async def test_patch_care_manager(client):
    data = await _create(client)
    eoc_id = data["id"]
    r = await client.patch(f"{BASE}/{eoc_id}", json={"care_manager": "Practitioner/30002"})
    assert r.status_code == 200
    d = r.json()
    assert d["care_manager_type"] == "Practitioner"
    assert d["care_manager_id"] == 30002


async def test_patch_diagnoses(client):
    data = await _create(client)
    eoc_id = data["id"]
    r = await client.patch(f"{BASE}/{eoc_id}", json={
        "diagnoses": [
            {"condition": "Condition/120002", "rank": 2}
        ]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["diagnoses"]) == 1
    assert d["diagnoses"][0]["reference_id"] == 120002
    assert d["diagnoses"][0]["rank"] == 2


async def test_patch_identifiers(client):
    data = await _create(client)
    eoc_id = data["id"]
    r = await client.patch(f"{BASE}/{eoc_id}", json={
        "identifiers": [{"system": "http://example.org", "value": "NEW-001"}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["identifiers"]) == 1
    assert d["identifiers"][0]["value"] == "NEW-001"


async def test_patch_status_history(client):
    data = await _create(client)
    eoc_id = data["id"]
    r = await client.patch(f"{BASE}/{eoc_id}", json={
        "status_history": [
            {"status": "active", "period_start": "2024-01-01T00:00:00Z"}
        ]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["status_history"]) == 1
    assert d["status_history"][0]["status"] == "active"


async def test_patch_not_found(client):
    r = await client.patch(f"{BASE}/9999999", json={"status": "finished"})
    assert r.status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_episode_of_care(client):
    data = await _create(client)
    eoc_id = data["id"]
    r = await client.delete(f"{BASE}/{eoc_id}")
    assert r.status_code == 204
    r2 = await client.get(f"{BASE}/{eoc_id}")
    assert r2.status_code == 404


async def test_delete_not_found(client):
    r = await client.delete(f"{BASE}/9999999")
    assert r.status_code == 404


# ── Auth / Permissions ────────────────────────────────────────────────────────


async def test_create_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.post(BASE + "/", json=MINIMAL)
    assert r.status_code in (401, 403)


async def test_read_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["episode_of_care:create", "episode_of_care:read", "episode_of_care:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    eoc_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.get(f"{BASE}/{eoc_id}")
    assert r.status_code in (401, 403)


async def test_delete_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["episode_of_care:create", "episode_of_care:read", "episode_of_care:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    eoc_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.delete(f"{BASE}/{eoc_id}")
    assert r.status_code in (401, 403)
