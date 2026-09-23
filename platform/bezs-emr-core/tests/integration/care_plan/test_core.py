"""Integration tests for /api/fhir/v1/care-plans endpoints."""
import pytest

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user

BASE = "/api/fhir/v1/care-plans"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "active",
    "intent": "plan",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "status": "active",
    "intent": "plan",
    "title": "Diabetes Management Plan",
    "description": "Comprehensive diabetes care plan",
    "subject": "Patient/10001",
    "subject_display": "John Doe",
    "encounter": "Encounter/20001",
    "encounter_display": "Initial Visit",
    "period_start": "2024-01-01T00:00:00Z",
    "period_end": "2024-12-31T23:59:59Z",
    "created": "2024-01-01T08:00:00Z",
    "author": "Practitioner/30001",
    "author_display": "Dr. Smith",
    "instantiates_canonical": "http://example.org/fhir/PlanDefinition/diabetes",
    "instantiates_uri": "http://example.org/protocols/diabetes",
    "identifiers": [
        {
            "system": "http://hospital.org/care-plans",
            "value": "CP-001",
            "use": "official",
        }
    ],
    "based_on": [{"reference": "CarePlan/290001", "reference_display": "Parent Plan"}],
    "replaces": [{"reference": "CarePlan/290002", "reference_display": "Old Plan"}],
    "part_of": [{"reference": "CarePlan/290003", "reference_display": "Master Plan"}],
    "categories": [
        {
            "coding_system": "http://snomed.info/sct",
            "coding_code": "736055001",
            "coding_display": "Individualized care plan",
            "text": "Diabetes Plan",
        }
    ],
    "contributors": [
        {"reference": "Practitioner/30002", "reference_display": "Dr. Jones"}
    ],
    "care_teams": [{"reference": "CareTeam/1", "reference_display": "Diabetes Team"}],
    "addresses": [
        {"reference": "Condition/120001", "reference_display": "Type 2 Diabetes"}
    ],
    "supporting_info": [
        {"reference": "Observation/160001", "reference_display": "HbA1c result"}
    ],
    "goals": [{"reference": "Goal/1", "reference_display": "Reduce HbA1c"}],
    "notes": [
        {
            "text": "Patient is motivated to follow the plan.",
            "time": "2024-01-01T09:00:00Z",
            "author_string": "Dr. Smith",
        }
    ],
    "activities": [
        {
            "reference": "ServiceRequest/80001",
            "reference_display": "Lab order",
            "detail_kind": "ServiceRequest",
            "detail_code_system": "http://snomed.info/sct",
            "detail_code_code": "43396009",
            "detail_code_display": "Haemoglobin A1c measurement",
            "detail_status": "scheduled",
            "detail_do_not_perform": False,
            "detail_description": "Check HbA1c every 3 months",
            "detail_scheduled_period_start": "2024-01-15T08:00:00Z",
            "detail_scheduled_period_end": "2024-01-15T12:00:00Z",
            "outcome_codeable_concepts": [
                {
                    "coding_system": "http://snomed.info/sct",
                    "coding_code": "415068001",
                    "coding_display": "Outcome code",
                }
            ],
            "outcome_references": [
                {"reference": "Observation/160002", "reference_display": "HbA1c result"}
            ],
            "progress": [
                {
                    "text": "Initial assessment completed.",
                    "time": "2024-01-10T10:00:00Z",
                    "author_string": "Nurse",
                }
            ],
            "detail_reason_codes": [
                {
                    "coding_system": "http://snomed.info/sct",
                    "coding_code": "44054006",
                    "coding_display": "Diabetes mellitus type 2",
                }
            ],
            "detail_reason_references": [
                {"reference": "Condition/120001", "reference_display": "Diabetes"}
            ],
            "detail_goals": [{"reference": "Goal/1", "reference_display": "Reduce HbA1c"}],
            "detail_performers": [
                {"reference": "Practitioner/30001", "reference_display": "Dr. Smith"}
            ],
        }
    ],
}


# ── Helper ────────────────────────────────────────────────────────────────────


async def _create(client, payload=None) -> dict:
    resp = await client.post(BASE + "/", json=payload or MINIMAL)
    assert resp.status_code == 200
    return resp.json()


# ── Create ────────────────────────────────────────────────────────────────────


async def test_create_care_plan_minimal(client):
    data = await _create(client)
    assert data["status"] == "active"
    assert data["intent"] == "plan"
    assert isinstance(data["id"], int)


async def test_create_care_plan_full(client):
    r = await client.post(BASE + "/", json=FULL)
    assert r.status_code == 200
    data = r.json()
    assert data["title"] == "Diabetes Management Plan"
    assert data["subject_type"] == "Patient"
    assert data["subject_id"] == 10001
    assert data["author_type"] == "Practitioner"
    assert data["encounter_type"] == "Encounter"
    assert len(data["identifiers"]) == 1
    assert len(data["categories"]) == 1
    assert len(data["activities"]) == 1
    act = data["activities"][0]
    assert act["detail_status"] == "scheduled"
    assert len(act["outcome_codeable_concepts"]) == 1
    assert len(act["outcome_references"]) == 1
    assert len(act["progress"]) == 1
    assert len(act["detail_reason_codes"]) == 1
    assert len(act["detail_reason_references"]) == 1
    assert len(act["detail_goals"]) == 1
    assert len(act["detail_performers"]) == 1
    assert len(data["notes"]) == 1


async def test_create_care_plan_fhir_format(client):
    r = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert r.status_code == 200
    data = r.json()
    assert data["resourceType"] == "CarePlan"
    assert data["status"] == "active"
    assert data["intent"] == "plan"
    assert data["title"] == "Diabetes Management Plan"
    assert data["subject"]["reference"] == "Patient/10001"
    assert data["author"]["reference"].startswith("Practitioner/")
    assert data["encounter"]["reference"].startswith("Encounter/")
    assert isinstance(data["instantiatesCanonical"], list)
    assert len(data["activity"]) == 1
    act = data["activity"][0]
    assert "detail" in act
    assert act["detail"]["status"] == "scheduled"
    assert "scheduledPeriod" in act["detail"]
    assert len(act["outcomeCodeableConcept"]) == 1
    assert len(act["outcomeReference"]) == 1
    assert len(act["progress"]) == 1


async def test_create_care_plan_with_timing(client):
    payload = {
        **MINIMAL,
        "activities": [
            {
                "detail_status": "in-progress",
                "detail_scheduled_timing_event": "2024-01-01T08:00:00Z,2024-02-01T08:00:00Z",
                "detail_scheduled_timing_repeat_frequency": 1,
                "detail_scheduled_timing_repeat_period": 7.0,
                "detail_scheduled_timing_repeat_period_unit": "d",
            }
        ],
    }
    r = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert r.status_code == 200
    act = r.json()["activity"][0]
    assert "scheduledTiming" in act["detail"]
    timing = act["detail"]["scheduledTiming"]
    assert len(timing["event"]) == 2
    assert timing["repeat"]["frequency"] == 1
    assert timing["repeat"]["period"] == 7.0
    assert timing["repeat"]["periodUnit"] == "d"


async def test_create_care_plan_with_scheduled_string(client):
    payload = {
        **MINIMAL,
        "activities": [{"detail_status": "not-started", "detail_scheduled_string": "Every Monday morning"}],
    }
    r = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert r.status_code == 200
    act = r.json()["activity"][0]
    assert act["detail"]["scheduledString"] == "Every Monday morning"


async def test_create_care_plan_invalid_status(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "status": "bad-status"})
    assert r.status_code == 422


async def test_create_care_plan_invalid_intent(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "intent": "bad-intent"})
    assert r.status_code == 422


async def test_create_care_plan_invalid_subject(client):
    r = await client.post(BASE + "/", json={**MINIMAL, "subject": "BadType/123"})
    assert r.status_code == 422


async def test_create_care_plan_invalid_activity_reference(client):
    r = await client.post(
        BASE + "/",
        json={**MINIMAL, "activities": [{"reference": "InvalidType/1", "detail_status": "scheduled"}]},
    )
    assert r.status_code == 422


# ── Get ───────────────────────────────────────────────────────────────────────


async def test_get_care_plan(client):
    data = await _create(client)
    cp_id = data["id"]
    r = await client.get(f"{BASE}/{cp_id}")
    assert r.status_code == 200
    assert r.json()["id"] == cp_id


async def test_get_care_plan_fhir(client):
    data = await _create(client)
    cp_id = data["id"]
    r = await client.get(f"{BASE}/{cp_id}", headers=FHIR_ACCEPT)
    assert r.status_code == 200
    d = r.json()
    assert d["resourceType"] == "CarePlan"
    assert d["id"] == str(cp_id)


async def test_get_care_plan_not_found(client):
    r = await client.get(f"{BASE}/9999999")
    assert r.status_code == 404


# ── List ──────────────────────────────────────────────────────────────────────


async def test_list_care_plans(client):
    await _create(client)
    r = await client.get(BASE + "/")
    assert r.status_code == 200
    data = r.json()
    assert "total" in data
    assert "data" in data
    assert data["total"] >= 1


async def test_list_care_plans_fhir(client):
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
    user_a_payload = {**MINIMAL, "user_id": "user-a", "org_id": "org-a"}
    user_b_payload = {**MINIMAL, "user_id": "user-b", "org_id": "org-b"}

    await client.post(BASE + "/", json=user_a_payload)
    await client.post(BASE + "/", json=user_b_payload)

    app.dependency_overrides[get_current_user] = make_test_user(
        sub="user-a",
        org_id="org-a",
        permissions=["care_plan:read"],
    )
    r = await client.get(f"{BASE}/me")
    assert r.status_code == 200
    data = r.json()
    for item in data["data"]:
        assert item["user_id"] == "user-a"


# ── Patch ─────────────────────────────────────────────────────────────────────


async def test_patch_care_plan_status(client):
    data = await _create(client)
    cp_id = data["id"]
    r = await client.patch(f"{BASE}/{cp_id}", json={"status": "completed"})
    assert r.status_code == 200
    assert r.json()["status"] == "completed"


async def test_patch_care_plan_title(client):
    data = await _create(client)
    cp_id = data["id"]
    r = await client.patch(f"{BASE}/{cp_id}", json={"title": "Updated Plan Title"})
    assert r.status_code == 200
    assert r.json()["title"] == "Updated Plan Title"


async def test_patch_care_plan_activities(client):
    data = await _create(client)
    cp_id = data["id"]
    r = await client.patch(f"{BASE}/{cp_id}", json={
        "activities": [{"detail_status": "in-progress", "detail_description": "New activity"}]
    })
    assert r.status_code == 200
    d = r.json()
    assert len(d["activities"]) == 1
    assert d["activities"][0]["detail_status"] == "in-progress"
    assert d["activities"][0]["detail_description"] == "New activity"


async def test_patch_care_plan_not_found(client):
    r = await client.patch(f"{BASE}/9999999", json={"status": "completed"})
    assert r.status_code == 404


async def test_patch_care_plan_invalid_status(client):
    data = await _create(client)
    cp_id = data["id"]
    r = await client.patch(f"{BASE}/{cp_id}", json={"status": "not-a-status"})
    assert r.status_code == 422


# ── Delete ────────────────────────────────────────────────────────────────────


async def test_delete_care_plan(client):
    data = await _create(client)
    cp_id = data["id"]
    r = await client.delete(f"{BASE}/{cp_id}")
    assert r.status_code == 204
    r2 = await client.get(f"{BASE}/{cp_id}")
    assert r2.status_code == 404


async def test_delete_care_plan_not_found(client):
    r = await client.delete(f"{BASE}/9999999")
    assert r.status_code == 404


# ── Auth / Permissions ────────────────────────────────────────────────────────


async def test_create_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.post(BASE + "/", json=MINIMAL)
    assert r.status_code in (401, 403)


async def test_read_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["care_plan:create", "care_plan:read", "care_plan:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    cp_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.get(f"{BASE}/{cp_id}")
    assert r.status_code in (401, 403)


async def test_delete_requires_auth(client):
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=["care_plan:create", "care_plan:read", "care_plan:delete"]
    )
    r_create = await client.post(BASE + "/", json=MINIMAL)
    cp_id = r_create.json()["id"]
    app.dependency_overrides[get_current_user] = make_test_user(permissions=[])
    r = await client.delete(f"{BASE}/{cp_id}")
    assert r.status_code in (401, 403)
