"""Integration tests for /api/fhir/v1/immunizations endpoints."""
import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/immunizations"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "completed",
    "occurrence_datetime": "2024-01-15T10:00:00Z",
    "vaccine_code_code": "208",
    "vaccine_code_display": "COVID-19, mRNA",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "completed",
    "occurrence_datetime": "2024-01-15T10:00:00Z",
    "vaccine_code_system": "http://hl7.org/fhir/sid/cvx",
    "vaccine_code_code": "208",
    "vaccine_code_display": "COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3 mL dose",
    "vaccine_code_text": "COVID-19 vaccine",
    "patient": "Patient/10001",
    "patient_display": "John Doe",
    "encounter": "Encounter/20001",
    "encounter_display": "Office visit",
    "recorded": "2024-01-15T10:05:00Z",
    "primary_source": True,
    "report_origin_system": "http://terminology.hl7.org/CodeSystem/immunization-origin",
    "report_origin_code": "provider",
    "report_origin_display": "Provider",
    "location": "Location/230001",
    "location_display": "Main clinic",
    "lot_number": "LOT-ABC-123",
    "expiration_date": "2025-12-31",
    "site_system": "http://terminology.hl7.org/CodeSystem/v3-ActSite",
    "site_code": "LA",
    "site_display": "Left Arm",
    "route_system": "http://terminology.hl7.org/CodeSystem/v3-RouteOfAdministration",
    "route_code": "IM",
    "route_display": "Intramuscular injection",
    "dose_quantity_value": "0.5",
    "dose_quantity_unit": "mL",
    "dose_quantity_system": "http://unitsofmeasure.org",
    "dose_quantity_code": "mL",
    "is_subpotent": False,
    "funding_source_system": "http://terminology.hl7.org/CodeSystem/immunization-funding-source",
    "funding_source_code": "private",
    "funding_source_display": "Private",
    "status_reason_system": "http://terminology.hl7.org/CodeSystem/v3-ActReason",
    "status_reason_code": "IMMUNE",
    "status_reason_display": "Immunity",
    "identifiers": [
        {"system": "http://example.org/imm", "value": "IMM-001", "use": "official"}
    ],
    "performers": [
        {"actor": "Practitioner/30001", "actor_display": "Dr. Smith",
         "function_code": "AP", "function_display": "Administering Provider"}
    ],
    "notes": [
        {"text": "Patient tolerated well", "author_string": "Dr. Smith"}
    ],
    "reason_codes": [
        {"coding_system": "http://snomed.info/sct", "coding_code": "429060002", "coding_display": "Procedure to meet occupational requirement"}
    ],
    "reason_references": [
        {"reference": "Condition/120001", "display": "At risk"}
    ],
    "educations": [
        {"document_type": "VAC-COVID", "presentation_date": "2024-01-15T09:45:00Z"}
    ],
    "program_eligibilities": [
        {"coding_system": "http://terminology.hl7.org/CodeSystem/immunization-program-eligibility",
         "coding_code": "ineligible", "coding_display": "Not Eligible"}
    ],
    "reactions": [
        {"reported": True, "detail": "Observation/160001", "detail_display": "Reaction obs"}
    ],
    "protocol_applied": [
        {
            "series": "2-dose series",
            "dose_number_positive_int": 1,
            "series_doses_positive_int": 2,
            "target_diseases": [
                {"coding_system": "http://snomed.info/sct", "coding_code": "840539006", "coding_display": "COVID-19"}
            ]
        }
    ],
}


# ── Helper ────────────────────────────────────────────────────────────────────


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_immunization_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["status"] == "completed"
    assert data["vaccine_code_code"] == "208"


async def test_create_immunization_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "completed"
    assert data["vaccine_code_code"] == "208"
    assert data["patient_type"] == "Patient"
    assert data["patient_id"] == 10001
    assert data["patient_display"] == "John Doe"
    assert data["encounter_type"] == "Encounter"
    assert data["encounter_id"] == 20001
    assert data["location_type"] == "Location"
    assert data["location_id"] == 230001
    assert data["lot_number"] == "LOT-ABC-123"
    assert data["expiration_date"] == "2025-12-31"
    assert data["site_code"] == "LA"
    assert data["route_code"] == "IM"
    assert data["is_subpotent"] is False
    assert data["primary_source"] is True
    assert len(data["identifiers"]) == 1
    assert data["identifiers"][0]["value"] == "IMM-001"
    assert len(data["performers"]) == 1
    assert data["performers"][0]["reference_type"] == "Practitioner"
    assert data["performers"][0]["reference_id"] == 30001
    assert len(data["notes"]) == 1
    assert data["notes"][0]["text"] == "Patient tolerated well"
    assert len(data["reason_codes"]) == 1
    assert data["reason_codes"][0]["coding_code"] == "429060002"
    assert len(data["reason_references"]) == 1
    assert data["reason_references"][0]["reference_type"] == "Condition"
    assert data["reason_references"][0]["reference_id"] == 120001
    assert len(data["educations"]) == 1
    assert data["educations"][0]["document_type"] == "VAC-COVID"
    assert len(data["program_eligibilities"]) == 1
    assert data["program_eligibilities"][0]["coding_code"] == "ineligible"
    assert len(data["reactions"]) == 1
    assert data["reactions"][0]["reported"] is True
    assert data["reactions"][0]["detail_type"] == "Observation"
    assert data["reactions"][0]["detail_id"] == 160001
    assert len(data["protocol_applied"]) == 1
    assert data["protocol_applied"][0]["series"] == "2-dose series"
    assert data["protocol_applied"][0]["dose_number_positive_int"] == 1
    assert data["protocol_applied"][0]["series_doses_positive_int"] == 2
    assert len(data["protocol_applied"][0]["target_diseases"]) == 1
    assert data["protocol_applied"][0]["target_diseases"][0]["coding_code"] == "840539006"


async def test_create_immunization_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "Immunization"
    assert isinstance(data["id"], str)
    assert data["status"] == "completed"
    assert "vaccineCode" in data
    assert data["vaccineCode"]["coding"][0]["code"] == "208"
    assert data["patient"]["reference"] == "Patient/10001"
    assert data["encounter"]["reference"] == "Encounter/20001"
    assert data["location"]["reference"] == "Location/230001"
    assert data["lotNumber"] == "LOT-ABC-123"
    assert data["expirationDate"] == "2025-12-31"
    assert data["primarySource"] is True
    assert "site" in data
    assert "route" in data
    assert "doseQuantity" in data
    assert len(data["identifier"]) == 1
    assert len(data["performer"]) == 1
    assert data["performer"][0]["actor"]["reference"] == "Practitioner/30001"
    assert len(data["note"]) == 1
    assert len(data["reasonCode"]) == 1
    assert len(data["reasonReference"]) == 1
    assert data["reasonReference"][0]["reference"] == "Condition/120001"
    assert len(data["education"]) == 1
    assert len(data["programEligibility"]) == 1
    assert len(data["reaction"]) == 1
    assert data["reaction"][0]["detail"]["reference"] == "Observation/160001"
    assert len(data["protocolApplied"]) == 1
    assert data["protocolApplied"][0]["doseNumberPositiveInt"] == 1
    assert len(data["protocolApplied"][0]["targetDisease"]) == 1


async def test_create_invalid_patient_type(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "patient": "InvalidType/999"})
    assert r.status_code == 422


async def test_create_invalid_reason_reference_type(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "reason_references": [{"reference": "BadType/999"}]})
    assert r.status_code == 422


async def test_create_invalid_performer_actor_type(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "performers": [{"actor": "BadType/999"}]})
    assert r.status_code == 422


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_immunization(client):
    data = await _create(client)
    imm_id = data["id"]
    r = await client.get(f"{BASE}/{imm_id}")
    assert r.status_code == 200
    assert r.json()["id"] == imm_id


async def test_get_immunization_fhir(client):
    data = await _create(client)
    imm_id = data["id"]
    r = await client.get(f"{BASE}/{imm_id}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    d = r.json()
    assert d["resourceType"] == "Immunization"
    assert d["id"] == str(imm_id)


async def test_get_immunization_not_found(client):
    r = await client.get(f"{BASE}/9999999")
    assert r.status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_immunizations(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "data" in data
    assert data["total"] >= 1


async def test_list_immunizations_fhir(client):
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
        permissions=["immunization:read"],
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    data = r.json()
    for item in data["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_status(client):
    data = await _create(client)
    imm_id = data["id"]
    r = await client.patch(f"{BASE}/{imm_id}", json={"status": "not-done"})
    assert r.status_code == 200
    assert r.json()["status"] == "not-done"


async def test_patch_lot_number(client):
    data = await _create(client)
    imm_id = data["id"]
    r = await client.patch(f"{BASE}/{imm_id}", json={"lot_number": "NEW-LOT-999"})
    assert r.status_code == 200
    assert r.json()["lot_number"] == "NEW-LOT-999"


async def test_patch_notes(client):
    data = await _create(client)
    imm_id = data["id"]
    r = await client.patch(f"{BASE}/{imm_id}", json={
        "notes": [{"text": "Updated note"}, {"text": "Second note"}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["notes"]) == 2
    assert d["notes"][0]["text"] == "Updated note"


async def test_patch_reactions(client):
    data = await _create(client)
    imm_id = data["id"]
    r = await client.patch(f"{BASE}/{imm_id}", json={
        "reactions": [{"reported": False}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["reactions"]) == 1
    assert d["reactions"][0]["reported"] is False


async def test_patch_protocol_applied(client):
    data = await _create(client)
    imm_id = data["id"]
    r = await client.patch(f"{BASE}/{imm_id}", json={
        "protocol_applied": [
            {
                "series": "Updated series",
                "dose_number_string": "booster",
                "target_diseases": [
                    {"coding_code": "840539006", "coding_display": "COVID-19"}
                ]
            }
        ]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["protocol_applied"]) == 1
    assert d["protocol_applied"][0]["series"] == "Updated series"
    assert d["protocol_applied"][0]["dose_number_string"] == "booster"
    assert len(d["protocol_applied"][0]["target_diseases"]) == 1


async def test_patch_not_found(client):
    r = await client.patch(f"{BASE}/9999999", json={"status": "completed"})
    assert r.status_code == 404


async def test_patch_invalid_status(client):
    data = await _create(client)
    imm_id = data["id"]
    r = await client.patch(f"{BASE}/{imm_id}", json={"status": "invalid-status"})
    assert r.status_code in (400, 422)


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_immunization(client):
    data = await _create(client)
    imm_id = data["id"]
    r = await client.delete(f"{BASE}/{imm_id}")
    assert r.status_code == 204
    r2 = await client.get(f"{BASE}/{imm_id}")
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
        permissions=["immunization:create", "immunization:read", "immunization:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    imm_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.get(f"{BASE}/{imm_id}")
    assert r.status_code in (401, 403)


async def test_delete_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["immunization:create", "immunization:read", "immunization:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    imm_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.delete(f"{BASE}/{imm_id}")
    assert r.status_code in (401, 403)
