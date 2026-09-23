"""Integration tests for /api/fhir/v1/tasks endpoints."""
import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/tasks"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "requested",
    "intent": "order",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "in-progress",
    "intent": "order",
    "priority": "urgent",
    "description": "Refer patient to specialist",
    "instantiates_canonical": "http://example.org/fhir/PlanDefinition/1",
    "instantiates_uri": "http://example.org/protocol/abc",
    "authored_on": "2024-01-15T10:30:00Z",
    "last_modified": "2024-01-15T12:00:00Z",
    "group_identifier_system": "http://example.org/group",
    "group_identifier_value": "GRP-001",
    "status_reason_system": "http://snomed.info/sct",
    "status_reason_code": "385660001",
    "status_reason_display": "Not done",
    "business_status_system": "http://example.org/status",
    "business_status_code": "waiting",
    "business_status_display": "Waiting",
    "code_system": "http://snomed.info/sct",
    "code_code": "3457005",
    "code_display": "Patient referral",
    "code_text": "Referral task",
    "focus": "ServiceRequest/80001",
    "focus_display": "Service Request A",
    "for": "Patient/10001",
    "for_display": "John Doe",
    "encounter": "Encounter/20001",
    "encounter_display": "Outpatient visit",
    "execution_period_start": "2024-01-15T10:00:00Z",
    "execution_period_end": "2024-01-15T18:00:00Z",
    "requester": "Practitioner/30001",
    "requester_display": "Dr. Smith",
    "owner": "Practitioner/30002",
    "owner_display": "Dr. Jones",
    "location": "Location/230001",
    "location_display": "Ward 3",
    "reason_code_system": "http://snomed.info/sct",
    "reason_code_code": "308646001",
    "reason_code_display": "Death certification",
    "reason_reference": "Condition/120001",
    "reason_reference_display": "Hypertension",
    "restriction_repetitions": 3,
    "restriction_period_start": "2024-01-15T00:00:00Z",
    "restriction_period_end": "2024-01-22T00:00:00Z",
    "identifiers": [
        {
            "system": "http://hospital.org/tasks",
            "value": "TASK-001",
        }
    ],
    "based_on": [
        {"reference": "ServiceRequest/80001", "reference_display": "Service Request"}
    ],
    "part_of": [
        {"reference": "Task/280001", "reference_display": "Parent Task"}
    ],
    "performer_types": [
        {
            "coding_system": "http://snomed.info/sct",
            "coding_code": "158965000",
            "coding_display": "Medical practitioner",
            "text": "Doctor",
        }
    ],
    "insurance": [
        {"reference": "Coverage/240001", "reference_display": "Health Insurance"}
    ],
    "notes": [
        {
            "text": "Patient has allergies to penicillin",
            "time": "2024-01-15T10:30:00Z",
            "author_string": "Dr. Smith",
        }
    ],
    "relevant_history": [
        {"reference": "Provenance/270001", "reference_display": "Creation event"}
    ],
    "restriction_recipients": [
        {"reference": "Patient/10001", "reference_display": "John Doe"}
    ],
    "inputs": [
        {
            "type_system": "http://example.org/input-type",
            "type_code": "order",
            "value_string": "Please expedite",
        }
    ],
    "outputs": [
        {
            "type_system": "http://example.org/output-type",
            "type_code": "result",
            "value_string": "Referral sent",
        }
    ],
}


# ── Helpers ────────────────────────────────────────────────────────────────────


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200
    return resp.json()


# ── Create minimal ─────────────────────────────────────────────────────────────


async def test_create_task_minimal(client):
    data = await _create(client)
    assert isinstance(data["id"], int)
    assert data["status"] == "requested"
    assert data["intent"] == "order"


async def test_create_task_minimal_fhir(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Task"
    assert isinstance(data["id"], str)
    assert data["status"] == "requested"
    assert data["intent"] == "order"


# ── Create full ────────────────────────────────────────────────────────────────


async def test_create_task_full(client):
    data = await _create(client, FULL)
    assert data["status"] == "in-progress"
    assert data["intent"] == "order"
    assert data["priority"] == "urgent"
    assert data["description"] == "Refer patient to specialist"
    assert data["code_code"] == "3457005"
    assert data["focus_type"] == "ServiceRequest"
    assert data["focus_id"] == 80001
    assert data["for_type"] == "Patient"
    assert data["for_id"] == 10001
    assert data["encounter_type"] == "Encounter"
    assert data["encounter_id"] == 20001
    assert data["requester_type"] == "Practitioner"
    assert data["requester_id"] == 30001
    assert data["owner_type"] == "Practitioner"
    assert data["owner_id"] == 30002
    assert data["location_type"] == "Location"
    assert data["location_id"] == 230001
    assert data["reason_code_code"] == "308646001"
    assert data["reason_reference_type"] == "Condition"
    assert data["reason_reference_id"] == 120001
    assert data["restriction_repetitions"] == 3
    assert len(data["identifiers"]) == 1
    assert data["identifiers"][0]["value"] == "TASK-001"
    assert len(data["based_on"]) == 1
    assert data["based_on"][0]["reference_type"] == "ServiceRequest"
    assert data["based_on"][0]["reference_id"] == 80001
    assert len(data["part_of"]) == 1
    assert data["part_of"][0]["reference_type"] == "Task"
    assert len(data["performer_types"]) == 1
    assert data["performer_types"][0]["coding_code"] == "158965000"
    assert len(data["insurance"]) == 1
    assert data["insurance"][0]["reference_type"] == "Coverage"
    assert data["insurance"][0]["reference_id"] == 240001
    notes = data.get("notes", [])
    assert len(notes) == 1
    assert notes[0]["text"] == "Patient has allergies to penicillin"
    assert notes[0]["author_string"] == "Dr. Smith"
    assert len(data["relevant_history"]) == 1
    assert data["relevant_history"][0]["reference_type"] == "Provenance"
    assert len(data["restriction_recipients"]) == 1
    assert data["restriction_recipients"][0]["reference_type"] == "Patient"
    inputs = data.get("inputs", [])
    assert len(inputs) == 1
    assert inputs[0]["value_string"] == "Please expedite"
    outputs = data.get("outputs", [])
    assert len(outputs) == 1
    assert outputs[0]["value_string"] == "Referral sent"


async def test_create_task_full_fhir(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Task"
    assert data["status"] == "in-progress"
    assert data["priority"] == "urgent"
    assert data["code"]["coding"][0]["code"] == "3457005"
    assert data["focus"]["reference"] == "ServiceRequest/80001"
    assert data["for"]["reference"] == "Patient/10001"
    assert data["encounter"]["reference"] == "Encounter/20001"
    assert data["requester"]["reference"] == "Practitioner/30001"
    assert data["owner"]["reference"] == "Practitioner/30002"
    assert data["location"]["reference"] == "Location/230001"
    assert data["reasonCode"]["coding"][0]["code"] == "308646001"
    assert data["reasonReference"]["reference"] == "Condition/120001"
    restriction = data.get("restriction", {})
    assert restriction["repetitions"] == 3
    assert len(restriction["recipient"]) == 1
    assert restriction["recipient"][0]["reference"] == "Patient/10001"
    assert len(data["identifier"]) == 1
    assert data["identifier"][0]["value"] == "TASK-001"
    assert len(data["basedOn"]) == 1
    assert data["basedOn"][0]["reference"] == "ServiceRequest/80001"
    assert len(data["partOf"]) == 1
    assert len(data["performerType"]) == 1
    assert data["performerType"][0]["coding"][0]["code"] == "158965000"
    assert len(data["insurance"]) == 1
    assert data["insurance"][0]["reference"] == "Coverage/240001"
    assert len(data["note"]) == 1
    assert data["note"][0]["text"] == "Patient has allergies to penicillin"
    assert data["note"][0]["authorString"] == "Dr. Smith"
    assert len(data["relevantHistory"]) == 1
    assert len(data["input"]) == 1
    assert data["input"][0]["valueString"] == "Please expedite"
    assert len(data["output"]) == 1
    assert data["output"][0]["valueString"] == "Referral sent"


# ── value[x] variants ──────────────────────────────────────────────────────────


async def test_input_value_boolean(client):
    payload = {
        **MINIMAL,
        "inputs": [{"type_code": "flag", "value_boolean": True}],
    }
    data = await _create(client, payload)
    assert data["inputs"][0]["value_boolean"] is True


async def test_input_value_boolean_fhir(client):
    payload = {
        **MINIMAL,
        "inputs": [{"type_code": "flag", "value_boolean": False}],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["input"][0]["valueBoolean"] is False


async def test_input_value_integer(client):
    payload = {
        **MINIMAL,
        "inputs": [{"type_code": "count", "value_integer": 42}],
    }
    data = await _create(client, payload)
    assert data["inputs"][0]["value_integer"] == 42


async def test_input_value_reference(client):
    payload = {
        **MINIMAL,
        "inputs": [
            {"type_code": "obs", "value_reference": "Observation/160001", "value_reference_display": "BP"}
        ],
    }
    data = await _create(client, payload)
    assert data["inputs"][0]["value_reference_type"] == "Observation"
    assert data["inputs"][0]["value_reference_id"] == 160001


async def test_input_value_reference_fhir(client):
    payload = {
        **MINIMAL,
        "inputs": [{"type_code": "obs", "value_reference": "Observation/160001"}],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["input"][0]["valueReference"]["reference"] == "Observation/160001"


# ── Validation ─────────────────────────────────────────────────────────────────


async def test_create_missing_status_rejected(client):
    payload = {**MINIMAL}
    payload.pop("status")
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


async def test_create_missing_intent_rejected(client):
    payload = {**MINIMAL}
    payload.pop("intent")
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


async def test_create_extra_field_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "bad_field": "x"})
    assert resp.status_code == 400


async def test_create_invalid_status(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "status": "not-a-status"})
    assert resp.status_code == 422


async def test_create_invalid_intent(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "intent": "invalid"})
    assert resp.status_code == 422


async def test_create_invalid_focus_format(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "focus": "NoSlash"})
    assert resp.status_code == 422


async def test_create_invalid_for_format(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "for": "NoSlash"})
    assert resp.status_code == 422


async def test_create_invalid_encounter_type(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "encounter": "Patient/10001"})
    assert resp.status_code == 422


async def test_create_invalid_requester_type(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "requester": "Location/230001"})
    assert resp.status_code == 422


async def test_create_invalid_owner_type(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "owner": "Location/230001"})
    assert resp.status_code == 422


async def test_create_invalid_insurance_type(client):
    resp = await client.post(
        BASE + "/",
        json={**MINIMAL, "insurance": [{"reference": "Patient/10001"}]},
    )
    assert resp.status_code == 422


async def test_create_invalid_part_of_type(client):
    resp = await client.post(
        BASE + "/",
        json={**MINIMAL, "part_of": [{"reference": "Patient/10001"}]},
    )
    assert resp.status_code == 422


async def test_create_invalid_relevant_history_type(client):
    resp = await client.post(
        BASE + "/",
        json={**MINIMAL, "relevant_history": [{"reference": "Patient/10001"}]},
    )
    assert resp.status_code == 422


async def test_create_invalid_restriction_recipient_type(client):
    resp = await client.post(
        BASE + "/",
        json={**MINIMAL, "restriction_recipients": [{"reference": "Location/230001"}]},
    )
    assert resp.status_code == 422


# ── Get by ID ───────────────────────────────────────────────────────────────────


async def test_get_task(client):
    created = await _create(client)
    task_id = created["id"]
    resp = await client.get(f"{BASE}/{task_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == task_id
    assert data["status"] == "requested"


async def test_get_task_fhir(client):
    created = await _create(client)
    task_id = created["id"]
    resp = await client.get(f"{BASE}/{task_id}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Task"
    assert data["id"] == str(task_id)


async def test_get_task_not_found(client):
    resp = await client.get(f"{BASE}/999999999")
    assert resp.status_code == 404


# ── List ─────────────────────────────────────────────────────────────────────────


async def test_list_tasks(client):
    await _create(client)
    await _create(client)
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert isinstance(data["data"], list)


async def test_list_tasks_fhir(client):
    await _create(client)
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "searchset"
    assert "entry" in data


async def test_list_tasks_pagination(client):
    for _ in range(3):
        await _create(client)
    resp = await client.get(BASE + "/?limit=2&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["data"]) <= 2
    assert data["limit"] == 2


# ── /me ──────────────────────────────────────────────────────────────────────────


async def test_me_returns_own_tasks(client):
    await _create(client)
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


async def test_me_does_not_return_other_users(client, other_client):
    _gcu = get_current_user
    perms = ["task:create", "task:read", "task:update", "task:delete"]
    client._transport.app.dependency_overrides[_gcu] = make_test_user(permissions=perms)
    await _create(client)
    other_client._transport.app.dependency_overrides[_gcu] = make_test_user(
        sub="u-other", org_id="org-other", permissions=["task:read"]
    )
    resp = await other_client.get(BASE + "/me")
    assert resp.json()["total"] == 0


# ── Patch ────────────────────────────────────────────────────────────────────────


async def test_patch_task_status(client):
    created = await _create(client)
    task_id = created["id"]
    resp = await client.patch(f"{BASE}/{task_id}", json={"status": "completed"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "completed"


async def test_patch_task_description(client):
    created = await _create(client)
    task_id = created["id"]
    resp = await client.patch(f"{BASE}/{task_id}", json={"description": "Updated task"})
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated task"


async def test_patch_task_for_reference(client):
    created = await _create(client)
    task_id = created["id"]
    resp = await client.patch(f"{BASE}/{task_id}", json={"for": "Patient/10002"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["for_type"] == "Patient"
    assert data["for_id"] == 10002


async def test_patch_task_replaces_notes(client):
    created = await _create(client, {
        **MINIMAL,
        "notes": [{"text": "Original note"}],
    })
    task_id = created["id"]
    resp = await client.patch(f"{BASE}/{task_id}", json={
        "notes": [{"text": "Replaced note"}]
    })
    assert resp.status_code == 200
    data = resp.json()
    notes = data.get("notes", [])
    assert len(notes) == 1
    assert notes[0]["text"] == "Replaced note"


async def test_patch_task_replaces_inputs(client):
    created = await _create(client, {
        **MINIMAL,
        "inputs": [{"type_code": "x", "value_string": "old"}],
    })
    task_id = created["id"]
    resp = await client.patch(f"{BASE}/{task_id}", json={
        "inputs": [{"type_code": "y", "value_integer": 99}]
    })
    assert resp.status_code == 200
    data = resp.json()
    inputs = data.get("inputs", [])
    assert len(inputs) == 1
    assert inputs[0]["value_integer"] == 99


async def test_patch_task_not_found(client):
    resp = await client.patch(f"{BASE}/999999999", json={"status": "completed"})
    assert resp.status_code == 404


async def test_patch_extra_field_rejected(client):
    created = await _create(client)
    task_id = created["id"]
    resp = await client.patch(f"{BASE}/{task_id}", json={"bad_field": "x"})
    assert resp.status_code == 400


async def test_patch_invalid_status(client):
    created = await _create(client)
    task_id = created["id"]
    resp = await client.patch(f"{BASE}/{task_id}", json={"status": "not-valid"})
    assert resp.status_code == 422


# ── Delete ───────────────────────────────────────────────────────────────────────


async def test_delete_task(client):
    created = await _create(client)
    task_id = created["id"]
    resp = await client.delete(f"{BASE}/{task_id}")
    assert resp.status_code == 204
    resp2 = await client.get(f"{BASE}/{task_id}")
    assert resp2.status_code == 404


async def test_delete_task_not_found(client):
    resp = await client.delete(f"{BASE}/999999999")
    assert resp.status_code == 404


# ── Auth ─────────────────────────────────────────────────────────────────────────


async def test_create_without_permission(client):
    _gcu = get_current_user
    client._transport.app.dependency_overrides[_gcu] = make_test_user(permissions=[])
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 403


async def test_delete_without_permission(client):
    _gcu = get_current_user
    perms = ["task:create", "task:read", "task:update", "task:delete"]
    client._transport.app.dependency_overrides[_gcu] = make_test_user(permissions=perms)
    created = await _create(client)
    task_id = created["id"]
    client._transport.app.dependency_overrides[_gcu] = make_test_user(permissions=["task:read"])
    resp = await client.delete(f"{BASE}/{task_id}")
    assert resp.status_code == 403


# ── note with author_reference ─────────────────────────────────────────────────


async def test_note_with_author_reference(client):
    payload = {
        **MINIMAL,
        "notes": [
            {
                "text": "Important note",
                "author_reference": "Practitioner/30001",
                "author_reference_display": "Dr. Smith",
            }
        ],
    }
    data = await _create(client, payload)
    note = data["notes"][0]
    assert note["author_reference_type"] == "Practitioner"
    assert note["author_reference_id"] == 30001


async def test_note_with_author_reference_fhir(client):
    payload = {
        **MINIMAL,
        "notes": [
            {
                "text": "Important note",
                "author_reference": "Practitioner/30001",
                "author_reference_display": "Dr. Smith",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    note = data["note"][0]
    assert "authorReference" in note
    assert note["authorReference"]["reference"] == "Practitioner/30001"


# ── restriction with recipients ────────────────────────────────────────────────


async def test_restriction_recipients_valid_types(client):
    for ref_type in ["Patient", "Practitioner", "PractitionerRole", "RelatedPerson", "Group", "Organization"]:
        payload = {
            **MINIMAL,
            "restriction_recipients": [{"reference": f"{ref_type}/1"}],
        }
        resp = await client.post(BASE + "/", json=payload)
        assert resp.status_code == 200, f"Failed for type {ref_type}"


# ── group identifier ───────────────────────────────────────────────────────────


async def test_group_identifier_fhir(client):
    payload = {
        **MINIMAL,
        "group_identifier_system": "http://example.org/group",
        "group_identifier_value": "GRP-001",
        "group_identifier_use": "usual",
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    gi = data.get("groupIdentifier", {})
    assert gi.get("system") == "http://example.org/group"
    assert gi.get("value") == "GRP-001"
    assert gi.get("use") == "usual"
