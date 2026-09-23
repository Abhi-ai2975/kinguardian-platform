"""Integration tests for /api/fhir/v1/specimens endpoints."""
import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/specimens"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "available",
    "type_system": "http://snomed.info/sct",
    "type_code": "119297000",
    "type_display": "Blood specimen",
    "type_text": "Blood",
    "subject": "Patient/10001",
    "subject_display": "John Doe",
    "received_time": "2024-01-01T09:00:00Z",
    "accession_identifier_system": "http://lab.org/accession",
    "accession_identifier_value": "ACC-001",
    "accession_identifier_use": "official",
    "collection": {
        "collector": "Practitioner/30001",
        "collector_display": "Dr. Smith",
        "collected_datetime": "2024-01-01T08:30:00Z",
        "duration_value": 30,
        "duration_unit": "min",
        "quantity_value": 5,
        "quantity_unit": "mL",
        "method_system": "http://snomed.info/sct",
        "method_code": "28520004",
        "method_display": "Venipuncture",
        "body_site_system": "http://snomed.info/sct",
        "body_site_code": "368209003",
        "body_site_display": "Right arm",
        "fasting_status_cc_system": "http://terminology.hl7.org/CodeSystem/v2-0916",
        "fasting_status_cc_code": "F",
        "fasting_status_cc_display": "Patient was fasting",
    },
    "processing": [
        {
            "description": "Centrifugation",
            "procedure_system": "http://snomed.info/sct",
            "procedure_code": "85457",
            "procedure_display": "Centrifugation",
            "time_datetime": "2024-01-01T09:30:00Z",
            "additives": [
                {"reference": "Substance/1", "display": "EDTA"}
            ],
        }
    ],
    "container": [
        {
            "description": "Red top tube",
            "type_system": "http://snomed.info/sct",
            "type_code": "702281005",
            "type_display": "Evacuated blood collection tube",
            "capacity_value": 10,
            "capacity_unit": "mL",
            "specimen_quantity_value": 5,
            "specimen_quantity_unit": "mL",
            "identifiers": [
                {"system": "http://lab.org/tube", "value": "TUBE-001"}
            ],
        }
    ],
    "conditions": [
        {
            "coding_system": "http://snomed.info/sct",
            "coding_code": "2667000",
            "coding_display": "Absent",
            "text": "No visible hemolysis",
        }
    ],
    "notes": [
        {
            "text": "Collected under fasting conditions.",
            "author_string": "Lab Tech A",
        }
    ],
    "identifiers": [
        {
            "system": "http://lab.org/spec",
            "value": "SPEC-001",
            "use": "official",
        }
    ],
    "parents": [
        {"reference": "Specimen/310001", "display": "Parent specimen"},
    ],
    "requests": [
        {"reference": "ServiceRequest/80001", "display": "Lab order"},
    ],
}


# ── Helper ────────────────────────────────────────────────────────────────────


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_specimen_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)


async def test_create_specimen_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "available"
    assert data["type_code"] == "119297000"
    assert data["subject_type"] == "Patient"
    assert data["subject_id"] == 10001
    assert data["subject_display"] == "John Doe"
    assert data["accession_identifier_value"] == "ACC-001"
    assert data["accession_identifier_system"] == "http://lab.org/accession"
    assert len(data["identifiers"]) == 1
    assert data["identifiers"][0]["value"] == "SPEC-001"
    assert len(data["parents"]) == 1
    assert data["parents"][0]["reference_type"] == "Specimen"
    assert data["parents"][0]["reference_id"] == 310001
    assert len(data["requests"]) == 1
    assert data["requests"][0]["reference_type"] == "ServiceRequest"
    assert "collection" in data
    col = data["collection"]
    assert col["collector_type"] == "Practitioner"
    assert col["collector_id"] == 30001
    assert col["quantity_value"] == 5.0
    assert col["method_code"] == "28520004"
    assert len(data["processing"]) == 1
    proc = data["processing"][0]
    assert proc["description"] == "Centrifugation"
    assert len(proc["additives"]) == 1
    assert proc["additives"][0]["reference_type"] == "Substance"
    assert proc["additives"][0]["reference_id"] == 1
    assert len(data["containers"]) == 1
    cont = data["containers"][0]
    assert cont["capacity_value"] == 10.0
    assert len(cont["identifiers"]) == 1
    assert cont["identifiers"][0]["value"] == "TUBE-001"
    assert len(data["conditions"]) == 1
    assert data["conditions"][0]["coding_code"] == "2667000"
    assert len(data["notes"]) == 1
    assert data["notes"][0]["text"] == "Collected under fasting conditions."


async def test_create_specimen_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "Specimen"
    assert isinstance(data["id"], str)
    assert data["status"] == "available"
    assert data["type"]["coding"][0]["code"] == "119297000"
    assert data["subject"]["reference"] == "Patient/10001"
    assert data["subject"]["display"] == "John Doe"
    assert "accessionIdentifier" in data
    assert data["accessionIdentifier"]["value"] == "ACC-001"
    assert len(data["identifier"]) == 1
    assert len(data["parent"]) == 1
    assert data["parent"][0]["reference"] == "Specimen/310001"
    assert len(data["request"]) == 1
    assert data["request"][0]["reference"] == "ServiceRequest/80001"
    assert "collection" in data
    col = data["collection"]
    assert col["collector"]["reference"] == "Practitioner/30001"
    assert "collectedDateTime" in col
    assert "quantity" in col
    assert col["quantity"]["value"] == 5.0
    assert "method" in col
    assert len(data["processing"]) == 1
    proc = data["processing"][0]
    assert proc["description"] == "Centrifugation"
    assert len(proc["additive"]) == 1
    assert proc["additive"][0]["reference"] == "Substance/1"
    assert len(data["container"]) == 1
    cont = data["container"][0]
    assert "capacity" in cont
    assert cont["capacity"]["value"] == 10.0
    assert len(data["condition"]) == 1
    assert len(data["note"]) == 1
    assert data["note"][0]["text"] == "Collected under fasting conditions."


async def test_create_specimen_invalid_subject(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "subject": "InvalidType/999"})
    assert r.status_code == 422


async def test_create_specimen_invalid_subject_format(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "subject": "bad-format"})
    assert r.status_code == 422


async def test_create_specimen_invalid_collector(client):
    r = await client.post(BASE + "/", json={
        **MINIMAL,
        "collection": {"collector": "InvalidType/999"},
    })
    assert r.status_code == 422


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_specimen(client):
    data = await _create(client)
    sp_id = data["id"]
    r = await client.get(f"{BASE}/{sp_id}")
    assert r.status_code == 200
    assert r.json()["id"] == sp_id


async def test_get_specimen_fhir(client):
    data = await _create(client)
    sp_id = data["id"]
    r = await client.get(f"{BASE}/{sp_id}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    d = r.json()
    assert d["resourceType"] == "Specimen"
    assert d["id"] == str(sp_id)


async def test_get_specimen_not_found(client):
    r = await client.get(f"{BASE}/9999999")
    assert r.status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_specimens(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "data" in data
    assert data["total"] >= 1


async def test_list_specimens_fhir(client):
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
        permissions=["specimen:read"],
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    data = r.json()
    for item in data["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_specimen_status(client):
    data = await _create(client)
    sp_id = data["id"]
    r = await client.patch(f"{BASE}/{sp_id}", json={"status": "unavailable"})
    assert r.status_code == 200
    assert r.json()["status"] == "unavailable"


async def test_patch_specimen_type(client):
    data = await _create(client)
    sp_id = data["id"]
    r = await client.patch(f"{BASE}/{sp_id}", json={"type_code": "122558006", "type_display": "Urine specimen"})
    assert r.status_code == 200
    assert r.json()["type_code"] == "122558006"


async def test_patch_specimen_conditions(client):
    data = await _create(client)
    sp_id = data["id"]
    r = await client.patch(f"{BASE}/{sp_id}", json={
        "conditions": [{"coding_code": "255566006", "coding_display": "Present"}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["conditions"]) == 1
    assert d["conditions"][0]["coding_code"] == "255566006"


async def test_patch_specimen_notes(client):
    data = await _create(client)
    sp_id = data["id"]
    r = await client.patch(f"{BASE}/{sp_id}", json={
        "notes": [{"text": "Updated note content"}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["notes"]) == 1
    assert d["notes"][0]["text"] == "Updated note content"


async def test_patch_specimen_collection(client):
    data = await _create(client)
    sp_id = data["id"]
    r = await client.patch(f"{BASE}/{sp_id}", json={
        "collection": {
            "quantity_value": 10,
            "quantity_unit": "mL",
            "method_code": "2025010",
            "method_display": "Swab",
        }
    })
    assert r.status_code == 200
    col = r.json().get("collection")
    assert col is not None
    assert col["quantity_value"] == 10.0


async def test_patch_specimen_not_found(client):
    r = await client.patch(f"{BASE}/9999999", json={"status": "available"})
    assert r.status_code == 404


async def test_patch_specimen_invalid_status(client):
    data = await _create(client)
    sp_id = data["id"]
    r = await client.patch(f"{BASE}/{sp_id}", json={"status": "not-a-status"})
    assert r.status_code in (400, 422)


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_specimen(client):
    data = await _create(client)
    sp_id = data["id"]
    r = await client.delete(f"{BASE}/{sp_id}")
    assert r.status_code == 204
    r2 = await client.get(f"{BASE}/{sp_id}")
    assert r2.status_code == 404


async def test_delete_specimen_not_found(client):
    r = await client.delete(f"{BASE}/9999999")
    assert r.status_code == 404


# ── Auth / Permissions ────────────────────────────────────────────────────────


async def test_create_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.post(BASE + "/", json=MINIMAL)
    assert r.status_code in (401, 403)


async def test_read_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["specimen:create", "specimen:read", "specimen:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    sp_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.get(f"{BASE}/{sp_id}")
    assert r.status_code in (401, 403)


async def test_delete_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["specimen:create", "specimen:read", "specimen:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    sp_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.delete(f"{BASE}/{sp_id}")
    assert r.status_code in (401, 403)
