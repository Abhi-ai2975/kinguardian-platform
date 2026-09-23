"""Integration tests for /api/fhir/v1/conditions endpoints."""
import pytest
from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/conditions"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "clinical_status_code": "active",
    "subject": "Patient/10001",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "clinical_status_system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
    "clinical_status_code": "active",
    "clinical_status_display": "Active",
    "verification_status_system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
    "verification_status_code": "confirmed",
    "verification_status_display": "Confirmed",
    "severity_system": "http://snomed.info/sct",
    "severity_code": "255604002",
    "severity_display": "Mild",
    "code_system": "http://snomed.info/sct",
    "code_code": "44054006",
    "code_display": "Diabetes mellitus type 2",
    "subject": "Patient/10001",
    "subject_display": "John Doe",
    "recorded_date": "2024-01-15T10:00:00Z",
    "onset_datetime": "2023-06-01T00:00:00Z",
    "recorder": "Practitioner/30001",
    "recorder_display": "Dr. Smith",
    "asserter": "Practitioner/30001",
    "asserter_display": "Dr. Smith",
    "category": [
        {
            "coding_system": "http://terminology.hl7.org/CodeSystem/condition-category",
            "coding_code": "problem-list-item",
            "coding_display": "Problem List Item",
        }
    ],
    "body_site": [
        {"coding_system": "http://snomed.info/sct", "coding_code": "368209003", "coding_display": "Right arm"}
    ],
    "note": [{"text": "Patient reports onset 3 years ago.", "author_string": "Dr. Smith"}],
}


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["clinical_status_code"] == "active"


async def test_create_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["clinical_status_code"] == "active"
    assert data["verification_status_code"] == "confirmed"
    assert data["severity_code"] == "255604002"
    assert data["code_code"] == "44054006"
    assert data["subject_type"] == "Patient"
    assert data["subject_id"] == 10001
    assert data["recorder_type"] == "Practitioner"
    assert data["recorder_id"] == 30001
    assert len(data["category"]) == 1
    assert data["category"][0]["coding_code"] == "problem-list-item"
    assert len(data["body_site"]) == 1
    assert len(data["note"]) == 1
    assert data["note"][0]["text"] == "Patient reports onset 3 years ago."


async def test_create_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "Condition"
    assert isinstance(data["id"], str)
    assert data["clinicalStatus"]["coding"][0]["code"] == "active"
    assert "subject" in data
    assert data["subject"]["reference"] == "Patient/10001"


async def test_create_with_stage(client):
    payload = {
        **MINIMAL,
        "stage": [
            {
                "summary_system": "http://snomed.info/sct",
                "summary_code": "2640006",
                "summary_display": "Late",
                "type_code": "staging",
            }
        ],
    }
    r = await client.post(BASE + "/", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["stage"]) == 1
    assert data["stage"][0]["summary_code"] == "2640006"


async def test_create_with_evidence(client):
    payload = {
        **MINIMAL,
        "evidence": [
            {
                "code": [{"coding_code": "386053000", "coding_display": "Evaluation procedure"}],
                "detail": [{"reference": "Observation/160001", "reference_display": "Blood glucose"}],
            }
        ],
    }
    r = await client.post(BASE + "/", json=payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["evidence"]) == 1


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_condition(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}")
    assert r.status_code == 200
    assert r.json()["id"] == data["id"]


async def test_get_condition_fhir(client):
    data = await _create(client)
    r = await client.get(f"{BASE}/{data['id']}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    assert r.json()["resourceType"] == "Condition"


async def test_get_not_found(client):
    r = await client.get(f"{BASE}/9999999")
    assert r.status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_conditions(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data and data["total"] >= 1


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
    data = r.json()
    assert len(data["data"]) <= 2


# ── /me ───────────────────────────────────────────────────────────────────────


async def test_me_filters_by_user(client):
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "user-a", "org_id": "org-a"})
    await client.post(BASE + "/", json={**MINIMAL, "user_id": "user-b", "org_id": "org-b"})

    app.dependency_overrides[get_current_user] = make_test_user(
        sub="user-a", org_id="org-a", permissions=["condition:read"]
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    for item in r.json()["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_clinical_status(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"clinical_status_code": "resolved"})
    assert r.status_code == 200
    assert r.json()["clinical_status_code"] == "resolved"


async def test_patch_severity(client):
    data = await _create(client)
    r = await client.patch(f"{BASE}/{data['id']}", json={"severity_code": "24484000", "severity_display": "Severe"})
    assert r.status_code == 200
    assert r.json()["severity_code"] == "24484000"


async def test_patch_not_found(client):
    r = await client.patch(f"{BASE}/9999999", json={"clinical_status_code": "resolved"})
    assert r.status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_condition(client):
    data = await _create(client)
    r = await client.delete(f"{BASE}/{data['id']}")
    assert r.status_code == 204
    assert (await client.get(f"{BASE}/{data['id']}")).status_code == 404


async def test_delete_not_found(client):
    assert (await client.delete(f"{BASE}/9999999")).status_code == 404


# ── Auth ──────────────────────────────────────────────────────────────────────


async def test_create_requires_permission(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    assert (await client.post(BASE + "/", json=MINIMAL)).status_code in (401, 403)


async def test_read_requires_permission(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["condition:create", "condition:delete"]
    )
    r = await client.post(BASE + "/", json=MINIMAL)
    cid = r.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    assert (await client.get(f"{BASE}/{cid}")).status_code in (401, 403)
