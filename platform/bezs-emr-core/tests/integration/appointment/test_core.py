"""Core appointment endpoint coverage.

These tests cover the six top-level appointment endpoints.
Nested payload behavior is intentionally split into a second module so this file
stays focused on route contract, status handling, and list behavior.
"""

from app.auth.dependencies import get_current_user
from app.main import app
from tests.conftest import make_test_user
from tests.helpers.assertions import (
    assert_fhir_appointment,
    assert_fhir_bundle,
    assert_operation_outcome,
    assert_paginated,
    assert_plain_appointment,
)
from tests.integration.appointment.support import (
    BASE,
    FHIR_ACCEPT,
    build_minimal_payload,
    create_appointment,
)


async def test_create_appointment_minimal(client):
    """A minimal but realistic payload should create a plain appointment response."""
    resp = await client.post(BASE + "/", json=await build_minimal_payload(client))
    assert resp.status_code == 200
    assert_plain_appointment(resp.json(), status="booked", minutes_duration=30)


async def test_create_appointment_returns_fhir_format(client):
    """FHIR Accept should switch the response body and content type."""
    resp = await client.post(BASE + "/", json=await build_minimal_payload(client), headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    assert "application/fhir+json" in resp.headers["content-type"]
    assert_fhir_appointment(resp.json(), status="booked")


async def test_create_appointment_extra_field_rejected(client):
    """Extra top-level fields must fail schema validation rather than being ignored."""
    payload = await build_minimal_payload(client)
    resp = await client.post(BASE + "/", json={**payload, "bad_field": "value"})
    assert_operation_outcome(resp.json(), expected_status=400, response_status=resp.status_code)


async def test_get_appointment_by_id_plain(client):
    """GET by public id should return the stored appointment in plain JSON."""
    appointment_id = await create_appointment(client)
    resp = await client.get(f"{BASE}/{appointment_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == appointment_id
    assert_plain_appointment(data, status="booked")


async def test_get_appointment_by_id_fhir(client):
    """FHIR reads should expose the same appointment through the FHIR mapper."""
    appointment_id = await create_appointment(client)
    resp = await client.get(f"{BASE}/{appointment_id}", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert_fhir_appointment(data, status="booked")
    assert data["id"] == str(appointment_id)


async def test_get_appointment_not_found(client):
    """Unknown public ids should resolve to an OperationOutcome 404."""
    resp = await client.get(f"{BASE}/999999")
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)


async def test_patch_appointment_status_and_description(client):
    """Patch should update mutable scheduling fields and preserve the public id."""
    appointment_id = await create_appointment(client)
    resp = await client.patch(
        f"{BASE}/{appointment_id}",
        json={"status": "arrived", "description": "Patient checked in"},
    )
    assert resp.status_code == 200
    assert_plain_appointment(resp.json(), status="arrived", description="Patient checked in")


async def test_patch_appointment_can_clear_nullable_fields(client):
    """Nullable patchable fields should be removable by explicitly sending null."""
    appointment_id = await create_appointment(client, await build_minimal_payload(client))
    resp = await client.patch(
        f"{BASE}/{appointment_id}",
        json={"description": None, "minutes_duration": None, "end": None},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "description" not in data
    assert "minutes_duration" not in data
    assert "end" not in data


async def test_patch_appointment_rejects_non_patchable_field(client):
    """Nested participant edits are not part of the patch contract and must fail validation."""
    appointment_id = await create_appointment(client)
    resp = await client.patch(
        f"{BASE}/{appointment_id}",
        json={"participant": [{"reference": "Patient/10001"}]},
    )
    assert_operation_outcome(resp.json(), expected_status=400, response_status=resp.status_code)


async def test_patch_appointment_not_found(client):
    """Patching a missing appointment should return a contract-level 404."""
    resp = await client.patch(f"{BASE}/999999", json={"status": "cancelled"})
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)


async def test_delete_appointment(client):
    """Delete should remove the appointment and make future reads return 404."""
    appointment_id = await create_appointment(client)
    resp = await client.delete(f"{BASE}/{appointment_id}")
    assert resp.status_code == 204
    follow_up = await client.get(f"{BASE}/{appointment_id}")
    assert follow_up.status_code == 404


async def test_delete_appointment_not_found(client):
    """Deleting an unknown public id should surface a not-found OperationOutcome."""
    resp = await client.delete(f"{BASE}/999999")
    assert_operation_outcome(resp.json(), expected_status=404, response_status=resp.status_code)


async def test_list_appointments_plain(client):
    """List should return a paginated plain response with created rows included."""
    await client.post(BASE + "/", json=await build_minimal_payload(client))
    await client.post(BASE + "/", json=await build_minimal_payload(client, user_id="u-list-2"))
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    assert_paginated(resp.json(), min_total=2)


async def test_list_appointments_fhir_bundle(client):
    """FHIR list responses should serialize as a searchset bundle."""
    await client.post(BASE + "/", json=await build_minimal_payload(client))
    resp = await client.get(BASE + "/", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert_fhir_bundle(data, min_total=1)
    assert data["entry"][0]["resource"]["resourceType"] == "Appointment"


async def test_list_appointments_pagination(client):
    """Pagination fields should reflect the requested window."""
    for idx in range(5):
        await client.post(BASE + "/", json=await build_minimal_payload(client, user_id=f"u-page-{idx}"))
    resp = await client.get(BASE + "/?limit=2&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["limit"] == 2
    assert data["offset"] == 0
    assert len(data["data"]) == 2
    assert data["total"] >= 5


async def test_list_appointments_filters_status_and_patient(client):
    """Status and patient filters should narrow the result set, not just the total."""
    matching = await build_minimal_payload(client, user_id="u-filter-match")
    non_matching = await build_minimal_payload(client, user_id="u-filter-miss")
    non_matching["status"] = "cancelled"

    match_resp = await client.post(BASE + "/", json=matching)
    miss_resp = await client.post(BASE + "/", json=non_matching)
    assert match_resp.status_code == 200
    assert miss_resp.status_code == 200

    patient_id = match_resp.json()["subject_id"]
    resp = await client.get(f"{BASE}/?status=booked&patient_id={patient_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    for appointment in data["data"]:
        assert appointment["status"] == "booked"
        assert appointment["subject_id"] == patient_id


async def test_list_appointments_filters_start_range(client):
    """Date range filters should operate on appointment.start."""
    early = await build_minimal_payload(client, user_id="u-early")
    late = await build_minimal_payload(client, user_id="u-late")
    early["start"] = "2026-05-01T09:00:00Z"
    early["end"] = "2026-05-01T09:30:00Z"
    late["start"] = "2026-07-01T09:00:00Z"
    late["end"] = "2026-07-01T09:30:00Z"

    await client.post(BASE + "/", json=early)
    await client.post(BASE + "/", json=late)

    resp = await client.get(
        BASE + "/?start_from=2026-06-01T00:00:00Z&start_to=2026-07-31T23:59:59Z"
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    for appointment in data["data"]:
        assert appointment["start"] >= "2026-06-01T00:00:00"
        assert appointment["start"] <= "2026-07-31T23:59:59"


async def test_list_appointments_filters_user_and_org(client):
    """Admin-style list filters should honor explicit user_id and org_id query params."""
    await client.post(BASE + "/", json=await build_minimal_payload(client, user_id="u-match", org_id="org-match"))
    await client.post(BASE + "/", json=await build_minimal_payload(client, user_id="u-miss", org_id="org-miss"))

    resp = await client.get(BASE + "/?user_id=u-match&org_id=org-match")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1
    for appointment in data["data"]:
        assert appointment["user_id"] == "u-match"
        assert appointment["org_id"] == "org-match"


async def test_list_appointments_empty(client):
    """The empty-state contract should still be a valid paginated response."""
    resp = await client.get(BASE + "/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["data"] == []


async def test_get_my_appointments_plain(client):
    """`/me` should return only the current identity's appointments in plain JSON."""
    await client.post(BASE + "/", json=await build_minimal_payload(client, user_id="u-test", org_id="org-test"))
    await client.post(BASE + "/", json=await build_minimal_payload(client, user_id="u-other", org_id="org-other"))
    resp = await client.get(BASE + "/me")
    assert resp.status_code == 200
    data = resp.json()
    assert_paginated(data, min_total=1)
    for appointment in data["data"]:
        assert appointment["user_id"] == "u-test"
        assert appointment["org_id"] == "org-test"


async def test_get_my_appointments_fhir_bundle(client):
    """FHIR `/me` output should use a Bundle just like the list endpoint."""
    await client.post(BASE + "/", json=await build_minimal_payload(client))
    resp = await client.get(BASE + "/me", headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    data = resp.json()
    assert_fhir_bundle(data, min_total=1)
    assert data["entry"][0]["resource"]["resourceType"] == "Appointment"


async def test_get_my_appointments_filters_and_pagination(client):
    """`/me` should apply the same status and pagination rules as the main list endpoint."""
    for idx in range(4):
        payload = await build_minimal_payload(client, user_id="u-test", org_id="org-test")
        payload["status"] = "booked" if idx < 3 else "cancelled"
        await client.post(BASE + "/", json=payload)

    resp = await client.get(BASE + "/me?status=booked&limit=2&offset=0")
    assert resp.status_code == 200
    data = resp.json()
    assert data["limit"] == 2
    assert data["offset"] == 0
    assert len(data["data"]) == 2
    for appointment in data["data"]:
        assert appointment["status"] == "booked"


async def test_get_my_appointments_org_isolation(client, other_client):
    """`/me` is the one route that currently enforces identity scoping in runtime behavior."""
    app.dependency_overrides[get_current_user] = make_test_user(
        permissions=[
            "appointment:create",
            "appointment:read",
            "appointment:update",
            "appointment:delete",
            "patient:create",
            "patient:read",
            "practitioner:create",
            "practitioner:read",
        ]
    )
    await client.post(BASE + "/", json=await build_minimal_payload(client, user_id="u-test", org_id="org-test"))
    app.dependency_overrides[get_current_user] = make_test_user(
        sub="u-other",
        org_id="org-other",
        permissions=[
            "appointment:create",
            "appointment:read",
            "appointment:update",
            "appointment:delete",
            "patient:create",
            "patient:read",
            "practitioner:create",
            "practitioner:read",
        ],
    )
    try:
        resp = await other_client.get(BASE + "/me")
        assert resp.status_code == 200
        assert resp.json()["total"] == 0
    finally:
        app.dependency_overrides[get_current_user] = make_test_user()


async def test_create_appointment_no_permission(client):
    """Permission checks should fail before request processing reaches the service layer."""
    payload = await build_minimal_payload(client)
    app.dependency_overrides[get_current_user] = make_test_user(permissions=["appointment:read"])
    try:
        resp = await client.post(BASE + "/", json=payload)
        assert_operation_outcome(resp.json(), expected_status=403, response_status=resp.status_code)
    finally:
        app.dependency_overrides[get_current_user] = make_test_user()


async def test_appointment_content_negotiation_defaults_to_plain(client):
    """The default Accept behavior should stay on plain JSON for non-FHIR clients."""
    resp = await client.post(BASE + "/", json=await build_minimal_payload(client))
    assert resp.status_code == 200
    assert "application/json" in resp.headers["content-type"]
    data = resp.json()
    assert "resourceType" not in data
    assert isinstance(data["id"], int)


async def test_appointment_content_negotiation_fhir_accept(client):
    """Explicit FHIR Accept should flip both media type and body structure."""
    resp = await client.post(BASE + "/", json=await build_minimal_payload(client), headers=FHIR_ACCEPT)
    assert resp.status_code == 200
    assert "application/fhir+json" in resp.headers["content-type"]
    data = resp.json()
    assert data["resourceType"] == "Appointment"
    assert isinstance(data["id"], str)
