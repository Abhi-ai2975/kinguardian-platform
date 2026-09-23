"""
Business logic layer for the Appointment resource.

AppointmentService sits between the router and AppointmentClient. It owns:
  - Empty-patch rejection (422 if the caller sends an empty PATCH body)
  - /me lookup: returns a paginated list of the caller's appointments (Variant B)
  - /book: simplified booking flow — validates slot availability, creates the
    Appointment, marks the Slot busy, and rolls back if the slot update fails.

The service does NOT inject created_by or updated_by — FhirClient does that.
The service does NOT inject user_id or org_id — the caller supplies them in the
request body (optional, matching the fhir-server schema).
"""

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.appointment import AppointmentClient
from app.fhir_client.slot import SlotClient
from app.schemas.appointment.input import (
    AppointmentCreateSchema,
    AppointmentPatchSchema,
    BookAppointmentInput,
    ListAppointmentsSchema,
    MeAppointmentsSchema,
    RescheduleAppointmentInput,
)


class AppointmentService:
    """
    Service layer for Appointment CRUD operations.

    Mediates between the FastAPI router and AppointmentClient. All methods
    accept an optional `accept` string threaded through to the fhir-server for
    content negotiation.
    """

    def __init__(self, client: AppointmentClient, slot_client: SlotClient) -> None:
        """
        Initialise with domain clients injected by the DI container.

        Args:
            client:      The domain-specific HTTP client for Appointment operations.
            slot_client: The SlotClient used during booking to validate and mark slots.
        """
        self._client = client
        self._slot_client = slot_client

    async def create(
        self,
        dto: AppointmentCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new Appointment resource on the fhir-server.

        Uses `by_alias=True` so the `class_` field is serialised as `"class"` in the
        JSON body (matching the fhir-server schema). `exclude_none=True` drops
        Optional fields that were not provided. FhirClient.post() stamps
        `created_by` from actor.sub automatically.

        All child arrays (participant, slot, reason, etc.) are embedded in this single
        call — the fhir-server has no separate sub-resource routes for Appointment.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — used by FhirClient for created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Appointment dict (plain JSON or FHIR R4).
        """
        # by_alias=True: serialises `class_` → `"class"` for the fhir-server
        payload = dto.model_dump(by_alias=True, exclude_none=True)
        return await self._client.create(payload, actor, accept=accept)

    async def get_by_id(
        self,
        appointment_id: int,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Fetch a single Appointment by integer primary key.

        The fhir-server populates all child arrays in the response automatically.

        Args:
            appointment_id: The appointment's integer ID on the fhir-server.
            actor:          Authenticated caller (kept for RBAC consistency).
            accept:         Content-type preference forwarded to the fhir-server.

        Returns:
            The Appointment resource dict with all child arrays populated.
        """
        return await self._client.get_by_id(appointment_id, accept=accept)

    async def list(
        self,
        filters: ListAppointmentsSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List Appointments with optional filters.

        Forwards all non-None filter values. `start_from`/`start_to` datetimes
        are serialised to ISO 8601 strings for the fhir-server query string.

        Args:
            filters: Validated query parameters from the router.
            actor:   Authenticated caller (kept for RBAC consistency).
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle depending on accept.
        """
        return await self._client.list(
            accept=accept,
            status=filters.status.value if filters.status else None,
            patient_id=filters.patient_id,
            practitioner_id=filters.practitioner_id,
            start_from=filters.start_from.isoformat() if filters.start_from else None,
            start_to=filters.start_to.isoformat() if filters.start_to else None,
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        appointment_id: int,
        dto: AppointmentPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update scalar fields on an Appointment.

        Only scalar fields are patchable (status, start, end, minutes_duration,
        description, cancellation_date, priority_*, recurrence_id, occurrence_changed).
        Rejects the request with 422 if all fields are None (empty body).
        FhirClient.patch() stamps updated_by from actor.sub automatically.

        Args:
            appointment_id: The appointment's integer primary key.
            dto:            Validated patch input; at least one field must be non-None.
            actor:          Authenticated caller — used by FhirClient for updated_by.
            accept:         Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Appointment resource dict.

        Raises:
            HTTPException(422): If the patch body is empty.
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided for update.",
            )
        # Serialise enum values to their string representation for the fhir-server.
        if "status" in payload and hasattr(payload["status"], "value"):
            payload["status"] = payload["status"].value
        return await self._client.patch(appointment_id, payload, actor, accept=accept)

    async def delete(self, appointment_id: int, actor: AuthUser) -> None:
        """
        Permanently delete an Appointment and all its child records.

        The fhir-server cascades the delete to all child tables (participant, slot,
        reason, etc.). This operation is irreversible.

        Args:
            appointment_id: The appointment's integer primary key to delete.
            actor:          Authenticated caller (kept for RBAC consistency).
        """
        await self._client.delete(appointment_id)

    async def book(
        self,
        dto: BookAppointmentInput,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Simplified booking flow: validate slot → create Appointment → mark Slot busy.

        The three-step sequence keeps the caller from needing to understand FHIR
        participant arrays or slot references. The service constructs everything
        automatically from the three required IDs.

        Step 1 — Validate slot availability.
            Fetch the slot without Accept forwarding (we always need plain JSON here
            for programmatic status inspection). If the slot status is not "free",
            raise 409 Conflict so the caller knows to pick a different slot.

        Step 2 — Create the Appointment.
            Build a FHIR-compatible payload with two participants (Practitioner and
            Patient), the Slot reference, and the slot's own start/end times.
            Optional fields (service_type, reason, note) are included only if
            provided — None values are dropped so the fhir-server schema is not
            polluted with empty arrays.

        Step 3 — Mark the Slot as busy.
            PATCH the slot to status="busy". If this step fails (e.g. fhir-server
            error or concurrent race), the Appointment created in Step 2 is deleted
            to keep the data consistent. A booked Appointment against a still-free
            Slot is a corrupt state.

        Args:
            dto:    Validated BookAppointmentInput from the router.
            actor:  Authenticated caller — used by FhirClient to stamp created_by.
            accept: Content-type preference forwarded to the fhir-server for the
                    final Appointment response only. Internal calls use plain JSON.

        Returns:
            The newly created and persisted Appointment dict (plain JSON or FHIR R4).

        Raises:
            HTTPException(404): If the slot does not exist.
            HTTPException(409): If the slot is not free (already booked or blocked).
            HTTPException(500): If the slot status update fails and the rollback
                                delete also fails — leaves a dangling appointment;
                                the original slot-patch error detail is included.
        """
        # ── Step 1: Validate that the slot is free ────────────────────────────
        # No accept forwarding — we always need plain JSON here to read `status`.
        slot = await self._slot_client.get_by_id(dto.slot_id)
        slot_status = slot.get("status")
        if slot_status != "free":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slot {dto.slot_id} is not available for booking (current status: '{slot_status}').",
            )

        # ── Step 2: Build and create the Appointment ──────────────────────────
        # Participants are constructed automatically — the caller should not need
        # to know the FHIR participant array shape.
        participant = [
            {
                # Practitioner actor — accepted immediately since the booking is
                # on their behalf (the practitioner's schedule owns the slot).
                "reference": f"Practitioner/{dto.practitioner_id}",
                **({"reference_display": dto.practitioner_display} if dto.practitioner_display else {}),
                "status": "accepted",
                "required": True,
            },
            {
                # Patient actor — needs-action until they confirm attendance.
                "reference": f"Patient/{dto.patient_id}",
                **({"reference_display": dto.patient_display} if dto.patient_display else {}),
                "status": "needs-action",
                "required": True,
            },
        ]

        # Link to the slot so the fhir-server can associate them.
        slot_ref = [{"reference": f"Slot/{dto.slot_id}"}]

        # Carry the slot's own times into the appointment so they stay in sync.
        # subject is the primary Patient reference — used by the doctor's appointment
        # list to show the patient name without walking the participant array.
        payload: dict = {
            "status": "pending",
            "start": slot.get("start"),
            "end": slot.get("end"),
            "subject": f"Patient/{dto.patient_id}",
            "participant": participant,
            "slot": slot_ref,
        }

        # Store patient display name on subject_display so the doctor's appointment
        # list can show it directly without a secondary Patient fetch.
        if dto.patient_display:
            payload["subject_display"] = dto.patient_display

        # Tenant scoping — forwarded only when the caller provides them.
        if dto.user_id:
            payload["user_id"] = dto.user_id
        if dto.org_id:
            payload["org_id"] = dto.org_id

        # Optional fields — only included when the caller provides a value.
        if dto.description:
            payload["description"] = dto.description

        if dto.service_type_code:
            payload["service_type"] = [
                {
                    "coding_code": dto.service_type_code,
                    "coding_display": dto.service_type_display,
                }
            ]

        if dto.reason_code or dto.reason_text:
            payload["reason"] = [
                {
                    "coding_code": dto.reason_code,
                    "text": dto.reason_text,
                }
            ]

        if dto.comment:
            # Stored as an Appointment note (R5). author_string defaults to the
            # actor's JWT subject so there is an audit trail on the note itself.
            payload["note"] = [
                {
                    "text": dto.comment,
                    "author_string": actor.sub,
                }
            ]

        # FhirClient.post() stamps created_by from actor.sub automatically.
        appointment = await self._client.create(payload, actor, accept=accept)

        # ── Step 3: Mark the slot as busy (rollback on failure) ───────────────
        appointment_id = appointment.get("id")
        try:
            await self._slot_client.patch(dto.slot_id, {"status": "busy"}, actor)
        except HTTPException as patch_err:
            # The appointment was created but the slot update failed — this is a
            # corrupt state. Attempt to delete the appointment to restore consistency.
            try:
                await self._client.delete(appointment_id)
            except Exception:
                # Rollback also failed — manual intervention required. Raise a 500
                # with the original patch error detail so ops can trace what went wrong.
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=(
                        f"Slot {dto.slot_id} update failed and rollback of Appointment {appointment_id} "
                        f"also failed. Original error: {patch_err.detail}"
                    ),
                )
            # Rollback succeeded — re-raise the original slot-patch error.
            raise

        return appointment

    async def reschedule(
        self,
        appointment_id: int,
        dto: RescheduleAppointmentInput,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Move an existing Appointment to a different Slot.

        Orchestrates a 5-step atomic swap with rollback on every failure point:

        Step 1 — Fetch the current appointment (plain JSON, no accept forwarding)
            and extract the old slot ID from the first entry of the `slot` reference
            array (e.g. `"Slot/42"` → 42). Raises 422 if the appointment has no
            slot reference (was not created via /book or did not include a slot array).

        Step 2 — Fetch the new slot (plain JSON) and validate it is still "free".
            Raises 409 Conflict if the new slot is already booked or blocked.
            Captures the new slot's `start` and `end` to sync them onto the appointment.

        Step 3 — PATCH old slot → status = "free".
            Un-books the previously reserved time window so it becomes available again.

        Step 4 — PATCH appointment → start + end from the new slot's times.
            Updates the appointment timing to match the new slot. On failure, the old
            slot is re-busied (rollback Step 3) and the error is re-raised.

        Note: the appointment's `slot` reference array is immutable on the fhir-server
        (child arrays cannot be patched), so only `start`/`end` are updated. The slot
        reference string continues to point to the original slot — this is a known
        fhir-server limitation that can only be resolved by delete+recreate.

        Step 5 — PATCH new slot → status = "busy".
            Marks the new time window as taken. On failure, the old slot is re-busied
            and the appointment timing is reverted (rollback Steps 3+4).

        Args:
            appointment_id: Integer ID of the appointment to reschedule.
            dto:            Validated RescheduleAppointmentInput (new_slot_id only).
            actor:          Authenticated caller — used for updated_by stamping.
            accept:         Content-type preference forwarded for the final response.

        Returns:
            The updated Appointment dict (plain JSON or FHIR R4).

        Raises:
            HTTPException(422): If the appointment has no slot reference.
            HTTPException(409): If the new slot is not free.
            HTTPException(500): If a rollback step also fails — leaves a note with details.
        """
        # ── Step 1: Fetch current appointment and extract old slot ID ─────────
        # Always fetch plain JSON here — we need to read the slot reference string
        # programmatically, not consume a FHIR Bundle.
        appointment = await self._client.get_by_id(appointment_id)

        slot_array = appointment.get("slot") or []
        if not slot_array:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Appointment {appointment_id} has no slot reference and cannot be rescheduled.",
            )

        # The fhir-server returns slot references as split fields: reference_type + reference_id.
        # reference_id is the integer slot PK — use it directly without string parsing.
        old_slot_id: int | None = slot_array[0].get("reference_id")
        if not old_slot_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Appointment {appointment_id} slot entry has no reference_id — cannot reschedule.",
            )

        # ── Step 2: Validate the new slot is free ─────────────────────────────
        # Fetch plain JSON — we need to inspect status and capture start/end.
        new_slot = await self._slot_client.get_by_id(dto.new_slot_id)
        new_slot_status = new_slot.get("status")
        if new_slot_status != "free":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Slot {dto.new_slot_id} is not available for booking (current status: '{new_slot_status}').",
            )

        # Capture the new slot's timing — these will replace the appointment's own
        # start/end so the appointment reflects the new time window.
        new_start = new_slot.get("start")
        new_end = new_slot.get("end")

        # ── Step 3: Free the old slot ─────────────────────────────────────────
        # Un-book the previously reserved time window so it becomes available
        # for other patients to book.
        await self._slot_client.patch(old_slot_id, {"status": "free"}, actor)

        # ── Step 4: Update appointment timing ─────────────────────────────────
        # Sync the appointment's start/end to the new slot's times.
        # Rollback: re-busy the old slot if this patch fails.
        timing_patch: dict = {}
        if new_start:
            timing_patch["start"] = new_start
        if new_end:
            timing_patch["end"] = new_end

        try:
            updated_appointment = await self._client.patch(
                appointment_id, timing_patch, actor, accept=accept
            )
        except HTTPException as appt_err:
            # Appointment patch failed — re-busy the old slot to restore consistency.
            try:
                await self._slot_client.patch(old_slot_id, {"status": "busy"}, actor)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=(
                        f"Appointment {appointment_id} timing update failed and rollback of Slot {old_slot_id} "
                        f"also failed. Manual intervention required. Original error: {appt_err.detail}"
                    ),
                )
            raise

        # ── Step 5: Mark the new slot as busy ─────────────────────────────────
        # Rollback: revert old slot back to busy + revert appointment timing if this fails.
        try:
            await self._slot_client.patch(dto.new_slot_id, {"status": "busy"}, actor)
        except HTTPException as slot_err:
            # New slot couldn't be marked busy — roll back both Steps 3 and 4.
            try:
                await self._slot_client.patch(old_slot_id, {"status": "busy"}, actor)
                # Restore original appointment timing.
                old_start = appointment.get("start")
                old_end = appointment.get("end")
                revert_patch: dict = {}
                if old_start:
                    revert_patch["start"] = old_start
                if old_end:
                    revert_patch["end"] = old_end
                if revert_patch:
                    await self._client.patch(appointment_id, revert_patch, actor)
            except Exception:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=(
                        f"New Slot {dto.new_slot_id} could not be marked busy and full rollback failed. "
                        f"Manual intervention required. Original error: {slot_err.detail}"
                    ),
                )
            raise

        return updated_appointment

    async def get_me(
        self,
        filters: MeAppointmentsSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Return a paginated list of Appointments belonging to the authenticated user (Variant B).

        Filters by `user_id=actor.sub` — the JWT subject is used as the user_id
        to scope results to the caller's own appointments. Additional optional filters
        (status, start_from, start_to, limit, offset) are forwarded from MeAppointmentsSchema.

        This is Variant B (1-to-many) — a user can have many appointments, so
        the response is a full paginated envelope, not a single resource.

        Args:
            filters: Validated query parameters from the router (no user_id/org_id).
            actor:   Authenticated caller — JWT subject used as user_id filter.
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or FHIR Bundle of the caller's Appointments.
        """
        return await self._client.list(
            accept=accept,
            user_id=actor.sub,
            status=filters.status.value if filters.status else None,
            start_from=filters.start_from.isoformat() if filters.start_from else None,
            start_to=filters.start_to.isoformat() if filters.start_to else None,
            limit=filters.limit,
            offset=filters.offset,
        )
