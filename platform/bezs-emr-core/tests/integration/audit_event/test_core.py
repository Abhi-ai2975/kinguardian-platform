"""Integration tests for /api/fhir/v1/audit-events endpoints."""
import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/audit-events"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "type_code": "rest",
    "recorded": "2024-01-15T10:00:00Z",
    "agents": [{"requestor": True}],
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "type_system": "http://dicom.nema.org/resources/ontology/DCM",
    "type_code": "rest",
    "type_display": "RESTful Operation",
    "action": "R",
    "period_start": "2024-01-15T09:50:00Z",
    "period_end": "2024-01-15T10:00:00Z",
    "recorded": "2024-01-15T10:00:00Z",
    "outcome": "0",
    "outcome_desc": "Success",
    "subtypes": [
        {"system": "http://hl7.org/fhir/restful-interaction", "code": "read", "display": "read"}
    ],
    "purpose_of_events": [
        {"coding_system": "http://terminology.hl7.org/CodeSystem/v3-ActReason",
         "coding_code": "TREAT", "coding_display": "Treatment", "text": "Care delivery"}
    ],
    "source_site": "cloud-ehr",
    "source_observer": "Practitioner/30001",
    "source_observer_display": "Dr. Smith",
    "source_types": [
        {"system": "http://terminology.hl7.org/CodeSystem/security-source-type",
         "code": "4", "display": "Application Server"}
    ],
    "agents": [
        {
            "type_system": "http://dicom.nema.org/resources/ontology/DCM",
            "type_code": "110150",
            "type_display": "Application",
            "who": "Practitioner/30001",
            "who_display": "Dr. Smith",
            "alt_id": "alt-001",
            "name": "Dr. Smith",
            "requestor": True,
            "location": "Location/230001",
            "location_display": "Main clinic",
            "media_system": "http://dicom.nema.org/resources/ontology/DCM",
            "media_code": "110010",
            "media_display": "Film",
            "network_address": "192.168.1.1",
            "network_type": "2",
            "roles": [
                {"coding_system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                 "coding_code": "AUT", "coding_display": "Author"}
            ],
            "policies": [
                {"value": "http://example.org/policy/read"}
            ],
            "purpose_of_uses": [
                {"coding_system": "http://terminology.hl7.org/CodeSystem/v3-ActReason",
                 "coding_code": "TREAT", "coding_display": "Treatment"}
            ],
        }
    ],
    "entities": [
        {
            "what": "Patient/10001",
            "what_display": "John Doe",
            "type_system": "http://terminology.hl7.org/CodeSystem/audit-entity-type",
            "type_code": "1",
            "type_display": "Person",
            "role_system": "http://terminology.hl7.org/CodeSystem/object-role",
            "role_code": "1",
            "role_display": "Patient",
            "lifecycle_system": "http://terminology.hl7.org/CodeSystem/dicom-audit-lifecycle",
            "lifecycle_code": "1",
            "lifecycle_display": "Origination / Creation",
            "name": "John Doe",
            "description": "Patient record accessed",
            "security_labels": [
                {"system": "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
                 "code": "N", "display": "normal"}
            ],
            "details": [
                {"type": "requestURL", "value_string": "GET /Patient/10001"}
            ],
        }
    ],
}


# ── Helper ────────────────────────────────────────────────────────────────────


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200, resp.text
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_audit_event_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["type_code"] == "rest"
    assert data["recorded"] is not None


async def test_create_audit_event_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["type_code"] == "rest"
    assert data["type_system"] == "http://dicom.nema.org/resources/ontology/DCM"
    assert data["action"] == "R"
    assert data["outcome"] == "0"
    assert data["outcome_desc"] == "Success"
    assert data["source_site"] == "cloud-ehr"
    assert data["source_observer_type"] == "Practitioner"
    assert data["source_observer_id"] == 30001
    assert data["source_observer_display"] == "Dr. Smith"

    assert len(data["subtypes"]) == 1
    assert data["subtypes"][0]["code"] == "read"

    assert len(data["purpose_of_events"]) == 1
    assert data["purpose_of_events"][0]["coding_code"] == "TREAT"

    assert len(data["source_types"]) == 1
    assert data["source_types"][0]["code"] == "4"

    assert len(data["agents"]) == 1
    agent = data["agents"][0]
    assert agent["who_type"] == "Practitioner"
    assert agent["who_id"] == 30001
    assert agent["requestor"] is True
    assert agent["location_type"] == "Location"
    assert agent["location_id"] == 230001
    assert agent["network_address"] == "192.168.1.1"
    assert len(agent["roles"]) == 1
    assert agent["roles"][0]["coding_code"] == "AUT"
    assert len(agent["policies"]) == 1
    assert agent["policies"][0]["value"] == "http://example.org/policy/read"
    assert len(agent["purpose_of_uses"]) == 1
    assert agent["purpose_of_uses"][0]["coding_code"] == "TREAT"

    assert len(data["entities"]) == 1
    entity = data["entities"][0]
    assert entity["what_type"] == "Patient"
    assert entity["what_id"] == 10001
    assert entity["what_display"] == "John Doe"
    assert entity["name"] == "John Doe"
    assert len(entity["security_labels"]) == 1
    assert entity["security_labels"][0]["code"] == "N"
    assert len(entity["details"]) == 1
    assert entity["details"][0]["type"] == "requestURL"
    assert entity["details"][0]["value_string"] == "GET /Patient/10001"


async def test_create_audit_event_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["resourceType"] == "AuditEvent"
    assert isinstance(data["id"], str)
    assert "type" in data
    assert data["type"]["code"] == "rest"
    assert data["action"] == "R"
    assert data["outcome"] == "0"
    assert data["outcomeDesc"] == "Success"
    assert data["recorded"] is not None
    assert "source" in data
    assert data["source"]["observer"]["reference"] == "Practitioner/30001"
    assert len(data["source"]["type"]) == 1
    assert len(data["agent"]) == 1
    assert data["agent"][0]["who"]["reference"] == "Practitioner/30001"
    assert data["agent"][0]["location"]["reference"] == "Location/230001"
    assert data["agent"][0]["requestor"] is True
    assert len(data["agent"][0]["role"]) == 1
    assert len(data["agent"][0]["policy"]) == 1
    assert len(data["entity"]) == 1
    assert data["entity"][0]["what"]["reference"] == "Patient/10001"
    assert len(data["entity"][0]["securityLabel"]) == 1
    assert len(data["entity"][0]["detail"]) == 1
    assert data["entity"][0]["detail"][0]["valueString"] == "GET /Patient/10001"


async def test_create_invalid_source_observer_type(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "source_observer": "BadType/999"})
    assert r.status_code == 422


async def test_create_invalid_agent_who_type(client):
    r = await client.post(BASE + "/", json={
        **MINIMAL,
        "agents": [{"requestor": True, "who": "BadType/999"}],
    })
    assert r.status_code == 422


async def test_create_invalid_agent_location_type(client):
    r = await client.post(BASE + "/", json={
        **MINIMAL,
        "agents": [{"requestor": True, "location": "BadType/999"}],
    })
    assert r.status_code == 422


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_audit_event(client):
    data = await _create(client)
    ae_id = data["id"]
    r = await client.get(f"{BASE}/{ae_id}")
    assert r.status_code == 200
    assert r.json()["id"] == ae_id


async def test_get_audit_event_fhir(client):
    data = await _create(client)
    ae_id = data["id"]
    r = await client.get(f"{BASE}/{ae_id}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    d = r.json()
    assert d["resourceType"] == "AuditEvent"
    assert d["id"] == str(ae_id)


async def test_get_audit_event_not_found(client):
    r = await client.get(f"{BASE}/9999999")
    assert r.status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_audit_events(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "data" in data
    assert data["total"] >= 1


async def test_list_audit_events_fhir(client):
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
        permissions=["audit_event:read"],
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    data = r.json()
    for item in data["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_outcome(client):
    data = await _create(client)
    ae_id = data["id"]
    r = await client.patch(f"{BASE}/{ae_id}", json={"outcome": "8"})
    assert r.status_code == 200
    assert r.json()["outcome"] == "8"


async def test_patch_outcome_desc(client):
    data = await _create(client)
    ae_id = data["id"]
    r = await client.patch(f"{BASE}/{ae_id}", json={"outcome_desc": "Updated description"})
    assert r.status_code == 200
    assert r.json()["outcome_desc"] == "Updated description"


async def test_patch_agents(client):
    data = await _create(client)
    ae_id = data["id"]
    r = await client.patch(f"{BASE}/{ae_id}", json={
        "agents": [
            {"requestor": False, "name": "System Agent", "alt_id": "sys-001"}
        ]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["agents"]) == 1
    assert d["agents"][0]["name"] == "System Agent"
    assert d["agents"][0]["requestor"] is False


async def test_patch_entities(client):
    data = await _create(client)
    ae_id = data["id"]
    r = await client.patch(f"{BASE}/{ae_id}", json={
        "entities": [
            {
                "what": "Patient/10002",
                "name": "Jane Doe",
                "details": [{"type": "method", "value_string": "GET"}],
            }
        ]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["entities"]) == 1
    assert d["entities"][0]["what_id"] == 10002
    assert d["entities"][0]["name"] == "Jane Doe"
    assert len(d["entities"][0]["details"]) == 1


async def test_patch_source_observer(client):
    data = await _create(client)
    ae_id = data["id"]
    r = await client.patch(f"{BASE}/{ae_id}", json={"source_observer": "Organization/190001"})
    assert r.status_code == 200
    d = r.json()
    assert d["source_observer_type"] == "Organization"
    assert d["source_observer_id"] == 190001


async def test_patch_not_found(client):
    r = await client.patch(f"{BASE}/9999999", json={"outcome": "0"})
    assert r.status_code == 404


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_audit_event(client):
    data = await _create(client)
    ae_id = data["id"]
    r = await client.delete(f"{BASE}/{ae_id}")
    assert r.status_code == 204
    r2 = await client.get(f"{BASE}/{ae_id}")
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
        permissions=["audit_event:create", "audit_event:read", "audit_event:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    ae_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.get(f"{BASE}/{ae_id}")
    assert r.status_code in (401, 403)


async def test_delete_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["audit_event:create", "audit_event:read", "audit_event:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    ae_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.delete(f"{BASE}/{ae_id}")
    assert r.status_code in (401, 403)
