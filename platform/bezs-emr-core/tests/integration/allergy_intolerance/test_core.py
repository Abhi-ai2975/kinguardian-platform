"""Integration tests for /api/fhir/v1/allergy-intolerances endpoints."""
import pytest

BASE = "/api/fhir/v1/allergy-intolerances"
FHIR_ACCEPT = {"Accept": "application/fhir+json"}

MINIMAL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "patient": "Patient/10001",
}

FULL = {
    "user_id": "u-test",
    "org_id": "org-test",
    "clinical_status_system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
    "clinical_status_code": "active",
    "clinical_status_display": "Active",
    "clinical_status_text": "Active allergy",
    "verification_status_system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
    "verification_status_code": "confirmed",
    "verification_status_display": "Confirmed",
    "type": "allergy",
    "criticality": "high",
    "code_system": "http://www.nlm.nih.gov/research/umls/rxnorm",
    "code_code": "1049502",
    "code_display": "Penicillin",
    "code_text": "Penicillin allergy",
    "patient": "Patient/10001",
    "patient_display": "John Doe",
    "encounter": "Encounter/20001",
    "encounter_display": "ER Visit",
    "onset_date_time": "2020-01-01T00:00:00Z",
    "recorded_date": "2020-01-02T00:00:00Z",
    "recorder": "Practitioner/30001",
    "recorder_display": "Dr. Smith",
    "asserter": "Patient/10001",
    "asserter_display": "John Doe (self-reported)",
    "last_occurrence": "2023-06-15T00:00:00Z",
    "identifiers": [
        {
            "use": "official",
            "system": "http://hospital.example.org/allergy-ids",
            "value": "AI-2020-001",
            "assigner": "Example Hospital",
        }
    ],
    "categories": ["medication", "food"],
    "notes": [
        {
            "text": "Patient reports severe reaction to penicillin-based antibiotics.",
            "author_string": "Dr. Smith",
        }
    ],
    "reactions": [
        {
            "substance_system": "http://www.nlm.nih.gov/research/umls/rxnorm",
            "substance_code": "7980",
            "substance_display": "Penicillin G",
            "manifestations": [
                {
                    "coding_system": "http://snomed.info/sct",
                    "coding_code": "271807003",
                    "coding_display": "Skin rash",
                }
            ],
            "description": "Diffuse urticarial rash within 30 minutes",
            "onset": "2020-01-01T02:00:00Z",
            "severity": "severe",
            "exposure_route_system": "http://snomed.info/sct",
            "exposure_route_code": "26643006",
            "exposure_route_display": "Oral route",
            "notes": [
                {
                    "text": "Reaction resolved with diphenhydramine.",
                    "author_string": "Dr. Smith",
                }
            ],
        }
    ],
}


# ── Create ─────────────────────────────────────────────────────────────────────


async def test_create_allergy_intolerance_minimal(client):
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("id") is not None
    assert isinstance(data["id"], int)
    assert data["patient_type"] == "Patient"
    assert data["patient_id"] == 10001


async def test_create_allergy_intolerance_full(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    assert data["clinical_status_code"] == "active"
    assert data["verification_status_code"] == "confirmed"
    assert data["type"] == "allergy"
    assert data["criticality"] == "high"
    assert data["code_code"] == "1049502"
    assert data["patient_type"] == "Patient"
    assert data["patient_id"] == 10001
    assert data["patient_display"] == "John Doe"
    assert data["encounter_type"] == "Encounter"
    assert data["encounter_id"] == 20001
    assert data["recorder_type"] == "Practitioner"
    assert data["recorder_id"] == 30001
    assert data["asserter_type"] == "Patient"
    assert data["asserter_id"] == 10001
    assert data["last_occurrence"] is not None


async def test_create_allergy_intolerance_fhir_minimal(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "AllergyIntolerance"
    assert isinstance(data["id"], str)
    assert data["patient"]["reference"] == "Patient/10001"


async def test_create_allergy_intolerance_fhir_full(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "AllergyIntolerance"
    assert data["clinicalStatus"]["coding"][0]["code"] == "active"
    assert data["verificationStatus"]["coding"][0]["code"] == "confirmed"
    assert data["type"] == "allergy"
    assert data["criticality"] == "high"
    assert data["code"]["coding"][0]["code"] == "1049502"
    assert data["patient"]["reference"] == "Patient/10001"
    assert data["patient"]["display"] == "John Doe"
    assert data["encounter"]["reference"] == "Encounter/20001"
    assert data["recorder"]["reference"] == "Practitioner/30001"
    assert data["asserter"]["reference"] == "Patient/10001"
    assert "onsetDateTime" in data
    assert "lastOccurrence" in data


async def test_create_allergy_intolerance_extra_field_rejected(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "bad_field": "x"})
    assert resp.status_code == 400


async def test_create_allergy_intolerance_missing_patient_rejected(client):
    payload = {"user_id": "u-test", "org_id": "org-test"}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


async def test_create_allergy_intolerance_invalid_patient_ref(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "patient": "NotARef"})
    assert resp.status_code == 422


async def test_create_allergy_intolerance_invalid_patient_type(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "patient": "Practitioner/30001"})
    assert resp.status_code == 422


async def test_create_allergy_intolerance_invalid_type(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "type": "unknown-type"})
    assert resp.status_code == 422


async def test_create_allergy_intolerance_invalid_criticality(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "criticality": "bad-value"})
    assert resp.status_code == 422


# ── Categories ─────────────────────────────────────────────────────────────────


async def test_create_allergy_intolerance_with_categories(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    cats = data.get("categories", [])
    assert len(cats) == 2
    cat_values = [c["category"] for c in cats]
    assert "medication" in cat_values
    assert "food" in cat_values


async def test_create_allergy_intolerance_fhir_with_categories(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "category" in data
    assert "medication" in data["category"]
    assert "food" in data["category"]


async def test_create_allergy_intolerance_invalid_category(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "categories": ["poison"]})
    assert resp.status_code == 422


# ── Notes ──────────────────────────────────────────────────────────────────────


async def test_create_allergy_intolerance_with_notes(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    notes = data.get("notes", [])
    assert len(notes) == 1
    assert "penicillin" in notes[0]["text"]
    assert notes[0]["author_string"] == "Dr. Smith"


async def test_create_allergy_intolerance_fhir_with_notes(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "note" in data
    assert len(data["note"]) == 1
    assert "penicillin" in data["note"][0]["text"]
    assert data["note"][0]["authorString"] == "Dr. Smith"


# ── Reactions ──────────────────────────────────────────────────────────────────


async def test_create_allergy_intolerance_with_reactions(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    reactions = data.get("reactions", [])
    assert len(reactions) == 1
    rx = reactions[0]
    assert rx["substance_code"] == "7980"
    assert rx["severity"] == "severe"
    assert rx["exposure_route_code"] == "26643006"
    manifestations = rx.get("manifestations", [])
    assert len(manifestations) == 1
    assert manifestations[0]["coding_code"] == "271807003"
    reaction_notes = rx.get("reaction_notes", [])
    assert len(reaction_notes) == 1
    assert "diphenhydramine" in reaction_notes[0]["text"]


async def test_create_allergy_intolerance_fhir_with_reactions(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "reaction" in data
    reactions = data["reaction"]
    assert len(reactions) == 1
    rx = reactions[0]
    assert rx["substance"]["coding"][0]["code"] == "7980"
    assert rx["severity"] == "severe"
    assert rx["exposureRoute"]["coding"][0]["code"] == "26643006"
    assert len(rx["manifestation"]) == 1
    assert rx["manifestation"][0]["coding"][0]["code"] == "271807003"
    assert "note" in rx
    assert "diphenhydramine" in rx["note"][0]["text"]


async def test_create_allergy_intolerance_reaction_invalid_severity(client):
    payload = {
        **MINIMAL,
        "reactions": [
            {
                "manifestations": [{"coding_code": "12345"}],
                "severity": "lethal",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 422


async def test_create_allergy_intolerance_reaction_no_manifestations_rejected(client):
    payload = {
        **MINIMAL,
        "reactions": [
            {
                "manifestations": [],
                "severity": "mild",
            }
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code in (400, 422)


# ── Onset variants ─────────────────────────────────────────────────────────────


async def test_onset_datetime(client):
    payload = {**MINIMAL, "onset_date_time": "2021-03-15T10:00:00Z"}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    assert resp.json()["onset_date_time"] is not None


async def test_onset_datetime_fhir(client):
    payload = {**MINIMAL, "onset_date_time": "2021-03-15T10:00:00Z"}
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "onsetDateTime" in data
    assert "2021-03-15" in data["onsetDateTime"]


async def test_onset_age(client):
    payload = {
        **MINIMAL,
        "onset_age_value": "35",
        "onset_age_unit": "a",
        "onset_age_system": "http://unitsofmeasure.org",
        "onset_age_code": "a",
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert float(data["onset_age_value"]) == pytest.approx(35.0)
    assert data["onset_age_unit"] == "a"


async def test_onset_age_fhir(client):
    payload = {
        **MINIMAL,
        "onset_age_value": "35",
        "onset_age_unit": "a",
        "onset_age_system": "http://unitsofmeasure.org",
        "onset_age_code": "a",
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "onsetAge" in data
    assert float(data["onsetAge"]["value"]) == pytest.approx(35.0)
    assert data["onsetAge"]["unit"] == "a"


async def test_onset_period(client):
    payload = {
        **MINIMAL,
        "onset_period_start": "2018-01-01T00:00:00Z",
        "onset_period_end": "2018-06-01T00:00:00Z",
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["onset_period_start"] is not None
    assert data["onset_period_end"] is not None


async def test_onset_period_fhir(client):
    payload = {
        **MINIMAL,
        "onset_period_start": "2018-01-01T00:00:00Z",
        "onset_period_end": "2018-06-01T00:00:00Z",
    }
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "onsetPeriod" in data
    assert "start" in data["onsetPeriod"]
    assert "end" in data["onsetPeriod"]


async def test_onset_string(client):
    payload = {**MINIMAL, "onset_string": "About 5 years ago"}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    assert resp.json()["onset_string"] == "About 5 years ago"


async def test_onset_string_fhir(client):
    payload = {**MINIMAL, "onset_string": "About 5 years ago"}
    resp = await client.post(BASE + "/", json=payload, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("onsetString") == "About 5 years ago"


# ── Get / Patch / Delete ───────────────────────────────────────────────────────


async def test_get_allergy_intolerance_by_id(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    ai_id = create_resp.json()["id"]
    resp = await client.get(f"{BASE}/{ai_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == ai_id


async def test_get_allergy_intolerance_fhir(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    ai_id = create_resp.json()["id"]
    resp = await client.get(f"{BASE}/{ai_id}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "AllergyIntolerance"
    assert data["id"] == ai_id


async def test_get_allergy_intolerance_not_found(client):
    resp = await client.get(f"{BASE}/999999")
    assert resp.status_code == 404


async def test_patch_allergy_intolerance_clinical_status(client):
    create_resp = await client.post(BASE + "/", json={**MINIMAL, "clinical_status_code": "active"})
    ai_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{ai_id}", json={"clinical_status_code": "resolved"})
    assert resp.status_code == 200
    assert resp.json()["clinical_status_code"] == "resolved"


async def test_patch_allergy_intolerance_type(client):
    create_resp = await client.post(BASE + "/", json={**MINIMAL, "type": "allergy"})
    ai_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{ai_id}", json={"type": "intolerance"})
    assert resp.status_code == 200
    assert resp.json()["type"] == "intolerance"


async def test_patch_allergy_intolerance_categories(client):
    create_resp = await client.post(BASE + "/", json={**MINIMAL, "categories": ["food"]})
    ai_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{ai_id}", json={"categories": ["medication", "environment"]})
    assert resp.status_code == 200
    cats = resp.json()["categories"]
    cat_values = [c["category"] for c in cats]
    assert "medication" in cat_values
    assert "environment" in cat_values
    assert "food" not in cat_values


async def test_patch_allergy_intolerance_reactions(client):
    create_resp = await client.post(BASE + "/", json=FULL)
    ai_id = create_resp.json()["id"]
    new_reactions = [
        {
            "manifestations": [
                {"coding_system": "http://snomed.info/sct", "coding_code": "39579001", "coding_display": "Anaphylaxis"}
            ],
            "severity": "severe",
        }
    ]
    resp = await client.patch(f"{BASE}/{ai_id}", json={"reactions": new_reactions})
    assert resp.status_code == 200
    reactions = resp.json()["reactions"]
    assert len(reactions) == 1
    assert reactions[0]["manifestations"][0]["coding_code"] == "39579001"


async def test_patch_allergy_intolerance_not_found(client):
    resp = await client.patch(f"{BASE}/999999", json={"clinical_status_code": "resolved"})
    assert resp.status_code == 404


async def test_patch_allergy_intolerance_extra_field_rejected(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    ai_id = create_resp.json()["id"]
    resp = await client.patch(f"{BASE}/{ai_id}", json={"bad_field": "x"})
    assert resp.status_code == 400


async def test_delete_allergy_intolerance(client):
    create_resp = await client.post(BASE + "/", json=MINIMAL)
    ai_id = create_resp.json()["id"]
    del_resp = await client.delete(f"{BASE}/{ai_id}")
    assert del_resp.status_code == 204
    get_resp = await client.get(f"{BASE}/{ai_id}")
    assert get_resp.status_code == 404


async def test_delete_allergy_intolerance_not_found(client):
    resp = await client.delete(f"{BASE}/999999")
    assert resp.status_code == 404


# ── List ───────────────────────────────────────────────────────────────────────


async def test_list_allergy_intolerances(client):
    await client.post(BASE + "/", json=MINIMAL)
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["data"]) >= 2


async def test_list_allergy_intolerances_fhir_bundle(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "Bundle"
    assert data["type"] == "searchset"
    assert data["total"] >= 1


async def test_list_allergy_intolerances_pagination(client):
    for _ in range(3):
        await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/?limit=2&offset=0")
    data = resp.json()
    assert data["limit"] == 2
    assert len(data["data"]) == 2
    assert data["total"] >= 3


async def test_list_allergy_intolerances_filter_type(client):
    await client.post(BASE + "/", json={**MINIMAL, "type": "allergy"})
    await client.post(BASE + "/", json={**MINIMAL, "type": "intolerance"})
    resp = await client.get(BASE + "/?type=allergy")
    assert resp.status_code == 200
    data = resp.json()
    for ai in data["data"]:
        assert ai["type"] == "allergy"


async def test_list_allergy_intolerances_filter_criticality(client):
    await client.post(BASE + "/", json={**MINIMAL, "criticality": "high"})
    await client.post(BASE + "/", json={**MINIMAL, "criticality": "low"})
    resp = await client.get(BASE + "/?criticality=high")
    assert resp.status_code == 200
    data = resp.json()
    for ai in data["data"]:
        assert ai["criticality"] == "high"


async def test_list_allergy_intolerances_empty(client):
    resp = await client.get(BASE + "/")
    data = resp.json()
    assert data["total"] == 0
    assert data["data"] == []


# ── /me ────────────────────────────────────────────────────────────────────────


async def test_get_my_allergy_intolerances_found(client):
    await client.post(BASE + "/", json=MINIMAL)
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


async def test_get_my_allergy_intolerances_org_isolation(client, other_client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    other_client._transport.app.dependency_overrides[_gcu] = make_test_user(
        sub="u-other", org_id="org-other", permissions=["allergy_intolerance:read"]
    )
    await client.post(BASE + "/", json=MINIMAL)
    resp = await other_client.get(BASE + "/me")
    assert resp.json()["total"] == 0


# ── Permissions ────────────────────────────────────────────────────────────────


async def test_create_allergy_intolerance_no_permission(client):
    from app.auth.dependencies import get_current_user as _gcu
    from tests.conftest import make_test_user

    app_obj = client._transport.app
    app_obj.dependency_overrides[_gcu] = make_test_user(permissions=["allergy_intolerance:read"])
    try:
        resp = await client.post(BASE + "/", json=MINIMAL)
        assert resp.status_code == 403
    finally:
        app_obj.dependency_overrides[_gcu] = make_test_user(
            permissions=[
                "allergy_intolerance:create",
                "allergy_intolerance:read",
                "allergy_intolerance:update",
                "allergy_intolerance:delete",
            ]
        )


# ── Content negotiation ────────────────────────────────────────────────────────


async def test_content_negotiation_defaults_to_plain(client):
    resp = await client.post(BASE + "/", json=MINIMAL)
    assert resp.status_code == 200
    data = resp.json()
    assert "resourceType" not in data
    assert isinstance(data["id"], int)


async def test_content_negotiation_fhir_accept(client):
    resp = await client.post(BASE + "/", json=MINIMAL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert data["resourceType"] == "AllergyIntolerance"
    assert isinstance(data["id"], str)


# ── Identifiers ────────────────────────────────────────────────────────────────


async def test_create_allergy_intolerance_with_identifiers(client):
    resp = await client.post(BASE + "/", json=FULL)
    assert resp.status_code == 200
    data = resp.json()
    identifiers = data.get("identifiers", [])
    assert len(identifiers) == 1
    assert identifiers[0]["use"] == "official"
    assert identifiers[0]["value"] == "AI-2020-001"
    assert identifiers[0]["assigner"] == "Example Hospital"


async def test_create_allergy_intolerance_fhir_with_identifiers(client):
    resp = await client.post(BASE + "/", json=FULL, headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert "identifier" in data
    assert len(data["identifier"]) == 1
    assert data["identifier"][0]["value"] == "AI-2020-001"
    assert data["identifier"][0]["assigner"]["display"] == "Example Hospital"


# ── Recorder / Asserter reference types ───────────────────────────────────────


async def test_recorder_practitioner_role(client):
    payload = {**MINIMAL, "recorder": "PractitionerRole/140001", "recorder_display": "Nurse Jane"}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["recorder_type"] == "PractitionerRole"
    assert data["recorder_id"] == 140001


async def test_recorder_related_person(client):
    payload = {**MINIMAL, "recorder": "RelatedPerson/99001"}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["recorder_type"] == "RelatedPerson"


async def test_asserter_practitioner_role(client):
    payload = {**MINIMAL, "asserter": "PractitionerRole/140002"}
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["asserter_type"] == "PractitionerRole"


async def test_recorder_invalid_type(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "recorder": "Organization/190001"})
    assert resp.status_code == 422


async def test_asserter_invalid_type(client):
    resp = await client.post(BASE + "/", json={**MINIMAL, "asserter": "Organization/190001"})
    assert resp.status_code == 422


# ── Multiple reactions ─────────────────────────────────────────────────────────


async def test_create_allergy_intolerance_multiple_reactions(client):
    payload = {
        **MINIMAL,
        "reactions": [
            {
                "manifestations": [{"coding_code": "271807003", "coding_display": "Skin rash"}],
                "severity": "mild",
            },
            {
                "manifestations": [
                    {"coding_code": "39579001", "coding_display": "Anaphylaxis"},
                    {"coding_code": "230145002", "coding_display": "Difficulty breathing"},
                ],
                "severity": "severe",
                "description": "Life-threatening anaphylaxis",
            },
        ],
    }
    resp = await client.post(BASE + "/", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    reactions = data.get("reactions", [])
    assert len(reactions) == 2
    severe = [r for r in reactions if r.get("severity") == "severe"]
    assert len(severe) == 1
    assert len(severe[0]["manifestations"]) == 2
