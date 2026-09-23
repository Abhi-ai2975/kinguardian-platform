"""Nested appointment payload coverage.

Appointment has most of its complexity in one large create payload rather than
separate child endpoints. These tests focus on mapper correctness and reference
validation for those nested structures.
"""

from tests.helpers.assertions import (
    assert_fhir_appointment,
    assert_operation_outcome,
    assert_plain_appointment,
)
from tests.integration.appointment.support import BASE, FHIR_ACCEPT, build_full_payload


async def test_create_appointment_full_plain_mapping(client):
    """The rich payload should preserve representative nested data in plain JSON."""
    resp = await client.post(BASE + "/", json=await build_full_payload(client))
    assert resp.status_code == 200

    data = resp.json()
    assert_plain_appointment(
        data,
        status="booked",
        subject_type="Patient",
        subject_display="Patient Primary",
        previous_appointment_id=40001,
        originating_appointment_id=40002,
        recurrence_id=2,
        occurrence_changed=True,
    )

    # Check one representative assertion from each nested section instead of duplicating every nullable field.
    assert data["identifier"][0]["value"] == "APT-001"
    assert data["class_"][0]["coding_code"] == "AMB"
    assert data["service_category"][0]["coding_code"] == "gp"
    assert data["service_type"][0]["reference_type"] == "HealthcareService"
    assert data["specialty"][0]["coding_code"] == "408443003"
    assert data["reason"][0]["reference_type"] == "Condition"
    assert data["supporting_information"][0]["reference_type"] == "DocumentReference"
    assert data["slot"][0]["reference_type"] == "Slot"
    assert data["based_on"][0]["reference_type"] == "ServiceRequest"
    assert data["replaces"][0]["reference_type"] == "Appointment"
    assert data["virtual_service"][0]["channel_type_code"] == "zoom"
    assert data["account"][0]["reference_type"] == "Account"
    assert data["note"][0]["author_string"] == "Scheduler"
    assert data["patient_instruction"][0]["reference_type"] == "DocumentReference"
    assert data["participant"][0]["reference_type"] == "Patient"
    assert data["participant"][1]["types"][0]["coding_code"] == "ATND"
    assert data["requested_period"][0]["period_start"].startswith("2026-06-02T09:00:00")
    assert data["recurrence_template"]["weekly_template"]["monday"] is True


async def test_create_appointment_full_fhir_mapping(client):
    """FHIR mapping should reconstruct references and camelCase fields correctly."""
    resp = await client.post(BASE + "/", json=await build_full_payload(client), headers=FHIR_ACCEPT)
    assert resp.status_code == 200

    data = resp.json()
    assert_fhir_appointment(data, status="booked", description="Telehealth follow-up for ongoing symptoms")
    assert data["subject"]["reference"].startswith("Patient/")
    assert data["serviceType"][0]["reference"]["reference"] == "HealthcareService/501"
    assert data["reason"][0]["reference"]["reference"] == "Condition/12345"
    assert data["supportingInformation"][0]["reference"] == "DocumentReference/456"
    assert data["slot"][0]["reference"] == "Slot/501"
    assert data["basedOn"][0]["reference"] == "ServiceRequest/80001"
    assert data["replaces"][0]["reference"] == "Appointment/40001"
    assert data["virtualService"][0]["channelType"]["code"] == "zoom"
    assert data["account"][0]["reference"] == "Account/601"
    assert data["note"][0]["authorString"] == "Scheduler"
    assert data["patientInstruction"][0]["reference"]["reference"] == "DocumentReference/789"
    assert data["participant"][0]["actor"]["reference"].startswith("Patient/")
    assert data["participant"][1]["type"][0]["coding"][0]["code"] == "ATND"
    assert data["requestedPeriod"][0]["start"].startswith("2026-06-02T09:00:00")
    assert data["recurrenceTemplate"]["weeklyTemplate"]["monday"] is True


async def test_create_appointment_invalid_service_type_reference_rejected(client):
    """Closed-set CodeableReference types must reject unsupported resource kinds."""
    payload = await build_full_payload(client)
    payload["service_type"][0]["reference"] = "Patient/123"
    resp = await client.post(BASE + "/", json=payload)
    assert_operation_outcome(resp.json(), expected_status=422, response_status=resp.status_code)


async def test_create_appointment_invalid_supporting_information_reference_rejected(client):
    """Open references still need the `ResourceType/id` shape."""
    payload = await build_full_payload(client)
    payload["supporting_information"][0]["reference"] = "bad-reference"
    resp = await client.post(BASE + "/", json=payload)
    assert_operation_outcome(resp.json(), expected_status=422, response_status=resp.status_code)


async def test_create_appointment_invalid_participant_reference_rejected(client):
    """Participant actor references are enum-validated and should reject unknown actor types."""
    payload = await build_full_payload(client)
    payload["participant"][0]["reference"] = "Organization/123"
    resp = await client.post(BASE + "/", json=payload)
    assert_operation_outcome(resp.json(), expected_status=422, response_status=resp.status_code)


async def test_create_appointment_invalid_encounter_id_rejected(client):
    """Encounter public ids are resolved before insert, so missing ones should fail fast."""
    payload = await build_full_payload(client)
    payload["encounter_id"] = 29999
    resp = await client.post(BASE + "/", json=payload)
    assert_operation_outcome(resp.json(), expected_status=422, response_status=resp.status_code)


async def test_create_appointment_requires_at_least_one_participant(client):
    """Participant is the one hard cardinality requirement on the create payload."""
    payload = await build_full_payload(client)
    payload["participant"] = []
    resp = await client.post(BASE + "/", json=payload)
    assert_operation_outcome(resp.json(), expected_status=400, response_status=resp.status_code)
