"""Integration tests for /api/fhir/v1/document-references endpoints."""
import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/document-references"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "current",
    "content": [
        {"attachment": {"url": "https://example.org/doc1.pdf", "title": "Test document"}}
    ],
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "current",
    "doc_status": "final",
    "master_identifier_system": "http://example.org/master",
    "master_identifier_value": "MASTER-001",
    "master_identifier_use": "official",
    "type_system": "http://loinc.org",
    "type_code": "34108-1",
    "type_display": "Outpatient Note",
    "type_text": "Outpatient visit note",
    "subject": "Patient/10001",
    "subject_display": "John Doe",
    "date": "2024-01-01T09:00:00Z",
    "authors": [
        {"reference": "Practitioner/30001", "display": "Dr. Smith"}
    ],
    "authenticator": "Practitioner/30001",
    "authenticator_display": "Dr. Smith",
    "description": "Annual physical exam note",
    "security_labels": [
        {"coding_system": "http://terminology.hl7.org/CodeSystem/v3-Confidentiality", "coding_code": "N", "coding_display": "Normal"}
    ],
    "content": [
        {
            "attachment": {
                "content_type": "application/pdf",
                "language": "en",
                "url": "https://example.org/documents/note.pdf",
                "title": "Outpatient note",
                "size": 1024,
            },
            "format_system": "urn:oid:1.3.6.1.4.1.19376.1.2.3",
            "format_code": "urn:ihe:pcc:xphr:2007",
            "format_display": "PCC XPHR",
        }
    ],
    "identifiers": [
        {"system": "http://example.org/docs", "value": "DOC-001", "use": "official"}
    ],
    "categories": [
        {"coding_system": "http://loinc.org", "coding_code": "34108-1", "coding_display": "Outpatient Note"}
    ],
    "relates_to": [
        {"code": "appends", "target": "DocumentReference/320001", "target_display": "Previous note"}
    ],
    "context": {
        "period_start": "2024-01-01T08:00:00Z",
        "period_end": "2024-01-01T09:00:00Z",
        "facility_type_system": "http://snomed.info/sct",
        "facility_type_code": "11429006",
        "facility_type_display": "Consultation",
        "practice_setting_system": "http://snomed.info/sct",
        "practice_setting_code": "394814009",
        "practice_setting_display": "General practice",
        "encounter": [{"reference": "Encounter/20001", "display": "Office visit"}],
        "event": [{"coding_system": "http://snomed.info/sct", "coding_code": "308335008", "coding_display": "Patient encounter procedure"}],
        "related": [{"reference": "Observation/160001", "display": "Related observation"}],
    },
}


# ── Helper ────────────────────────────────────────────────────────────────────


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_document_reference_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["status"] == "current"
    assert len(data["content"]) == 1


async def test_create_document_reference_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["status"] == "current"
    assert data["doc_status"] == "final"
    assert data["type_code"] == "34108-1"
    assert data["subject_type"] == "Patient"
    assert data["subject_id"] == 10001
    assert data["subject_display"] == "John Doe"
    assert data["master_identifier_value"] == "MASTER-001"
    assert data["master_identifier_system"] == "http://example.org/master"
    assert data["description"] == "Annual physical exam note"
    assert data["authenticator_type"] == "Practitioner"
    assert data["authenticator_id"] == 30001
    assert len(data["authors"]) == 1
    assert data["authors"][0]["reference_type"] == "Practitioner"
    assert data["authors"][0]["reference_id"] == 30001
    assert len(data["content"]) == 1
    assert data["content"][0]["attachment_url"] == "https://example.org/documents/note.pdf"
    assert data["content"][0]["attachment_content_type"] == "application/pdf"
    assert data["content"][0]["format_code"] == "urn:ihe:pcc:xphr:2007"
    assert len(data["identifiers"]) == 1
    assert data["identifiers"][0]["value"] == "DOC-001"
    assert len(data["categories"]) == 1
    assert data["categories"][0]["coding_code"] == "34108-1"
    assert len(data["relates_to"]) == 1
    assert data["relates_to"][0]["code"] == "appends"
    assert data["relates_to"][0]["target_type"] == "DocumentReference"
    assert data["relates_to"][0]["target_id"] == 320001
    assert len(data["security_labels"]) == 1
    assert data["security_labels"][0]["coding_code"] == "N"
    assert data["context_period_start"] is not None
    assert data["context_facility_type_code"] == "11429006"
    assert data["context_practice_setting_code"] == "394814009"
    assert len(data["context_encounters"]) == 1
    assert data["context_encounters"][0]["reference_type"] == "Encounter"
    assert data["context_encounters"][0]["reference_id"] == 20001
    assert len(data["context_events"]) == 1
    assert data["context_events"][0]["coding_code"] == "308335008"
    assert len(data["context_related"]) == 1
    assert data["context_related"][0]["reference_type"] == "Observation"
    assert data["context_related"][0]["reference_id"] == 160001


async def test_create_document_reference_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "DocumentReference"
    assert isinstance(data["id"], str)
    assert data["status"] == "current"
    assert data["docStatus"] == "final"
    assert data["type"]["coding"][0]["code"] == "34108-1"
    assert data["subject"]["reference"] == "Patient/10001"
    assert "masterIdentifier" in data
    assert data["masterIdentifier"]["value"] == "MASTER-001"
    assert len(data["identifier"]) == 1
    assert len(data["author"]) == 1
    assert data["author"][0]["reference"] == "Practitioner/30001"
    assert data["authenticator"]["reference"] == "Practitioner/30001"
    assert len(data["content"]) == 1
    assert data["content"][0]["attachment"]["url"] == "https://example.org/documents/note.pdf"
    assert "format" in data["content"][0]
    assert len(data["relatesTo"]) == 1
    assert data["relatesTo"][0]["code"] == "appends"
    assert data["relatesTo"][0]["target"]["reference"] == "DocumentReference/320001"
    assert len(data["securityLabel"]) == 1
    assert "context" in data
    ctx = data["context"]
    assert "period" in ctx
    assert "facilityType" in ctx
    assert "practiceSetting" in ctx
    assert len(ctx["encounter"]) == 1
    assert ctx["encounter"][0]["reference"] == "Encounter/20001"
    assert len(ctx["event"]) == 1
    assert len(ctx["related"]) == 1
    assert ctx["related"][0]["reference"] == "Observation/160001"


async def test_create_invalid_subject(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "subject": "InvalidType/999"})
    assert r.status_code == 422


async def test_create_invalid_author(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "authors": [{"reference": "BadType/999"}]})
    assert r.status_code == 422


async def test_create_invalid_relates_to_code(client):
    r = await client.post(BASE + "/", json={
        **MINIMAL,
        "relates_to": [{"code": "invalid-code", "target": "DocumentReference/320001"}],
    })
    assert r.status_code == 422


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_document_reference(client):
    data = await _create(client)
    dr_id = data["id"]
    r = await client.get(f"{BASE}/{dr_id}")
    assert r.status_code == 200
    assert r.json()["id"] == dr_id


async def test_get_document_reference_fhir(client):
    data = await _create(client)
    dr_id = data["id"]
    r = await client.get(f"{BASE}/{dr_id}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    d = r.json()
    assert d["resourceType"] == "DocumentReference"
    assert d["id"] == str(dr_id)


async def test_get_document_reference_not_found(client):
    r = await client.get(f"{BASE}/9999999")
    assert r.status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_document_references(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "data" in data
    assert data["total"] >= 1


async def test_list_document_references_fhir(client):
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
        permissions=["document_reference:read"],
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    data = r.json()
    for item in data["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_status(client):
    data = await _create(client)
    dr_id = data["id"]
    r = await client.patch(f"{BASE}/{dr_id}", json={"status": "superseded"})
    assert r.status_code == 200
    assert r.json()["status"] == "superseded"


async def test_patch_description(client):
    data = await _create(client)
    dr_id = data["id"]
    r = await client.patch(f"{BASE}/{dr_id}", json={"description": "Updated description"})
    assert r.status_code == 200
    assert r.json()["description"] == "Updated description"


async def test_patch_content(client):
    data = await _create(client)
    dr_id = data["id"]
    r = await client.patch(f"{BASE}/{dr_id}", json={
        "content": [{"attachment": {"url": "https://example.org/updated.pdf", "title": "Updated"}}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["content"]) == 1
    assert d["content"][0]["attachment_url"] == "https://example.org/updated.pdf"


async def test_patch_security_labels(client):
    data = await _create(client)
    dr_id = data["id"]
    r = await client.patch(f"{BASE}/{dr_id}", json={
        "security_labels": [{"coding_code": "R", "coding_display": "Restricted"}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["security_labels"]) == 1
    assert d["security_labels"][0]["coding_code"] == "R"


async def test_patch_context(client):
    data = await _create(client)
    dr_id = data["id"]
    r = await client.patch(f"{BASE}/{dr_id}", json={
        "context": {
            "period_start": "2024-06-01T08:00:00Z",
            "encounter": [{"reference": "Encounter/20002"}],
        }
    })
    assert r.status_code == 200
    d = r.json()
    assert d["context_period_start"] is not None
    assert len(d["context_encounters"]) == 1
    assert d["context_encounters"][0]["reference_id"] == 20002


async def test_patch_not_found(client):
    r = await client.patch(f"{BASE}/9999999", json={"status": "current"})
    assert r.status_code == 404


async def test_patch_invalid_status(client):
    data = await _create(client)
    dr_id = data["id"]
    r = await client.patch(f"{BASE}/{dr_id}", json={"status": "not-valid"})
    assert r.status_code in (400, 422)


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_document_reference(client):
    data = await _create(client)
    dr_id = data["id"]
    r = await client.delete(f"{BASE}/{dr_id}")
    assert r.status_code == 204
    r2 = await client.get(f"{BASE}/{dr_id}")
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
        permissions=["document_reference:create", "document_reference:read", "document_reference:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    dr_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.get(f"{BASE}/{dr_id}")
    assert r.status_code in (401, 403)


async def test_delete_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["document_reference:create", "document_reference:read", "document_reference:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    dr_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.delete(f"{BASE}/{dr_id}")
    assert r.status_code in (401, 403)
