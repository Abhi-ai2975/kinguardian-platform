"""
Business logic layer for the Slot resource.

SlotService sits between the router and SlotClient. It owns:
  - Empty-patch rejection (422 if the caller sends an empty PATCH body)
  - Auto slot generation (POST /slots/generate) — resolves service_category,
    service_type, and specialty from the Schedule / PractitionerRole actor,
    then creates one Slot per slot_duration_minutes interval in the window.

The service does NOT inject `created_by` or `updated_by` into the payload —
FhirClient.post() and FhirClient.patch() do that automatically from actor.sub.

The service does NOT inject `user_id` or `org_id` — the caller supplies those
in the request body (or omits them, matching the fhir-server's Optional schema).
"""

from datetime import timedelta

from fastapi import HTTPException, status

from app.auth.models import AuthUser
from app.fhir_client.practitioner_role import PractitionerRoleClient
from app.fhir_client.schedule import ScheduleClient
from app.fhir_client.slot import SlotClient
from app.schemas.slot.input import (
    ListSlotsSchema,
    SlotCreateSchema,
    SlotGenerateSchema,
    SlotPatchSchema,
    SlotServiceCategoryInput,
    SlotServiceTypeInput,
    SlotSpecialtyInput,
)
from app.schemas.slot.response import SlotGenerateResponse


class SlotService:
    """
    Service layer for Slot CRUD and auto-generation operations.

    Mediates between the FastAPI router and the domain clients. All read/write
    methods accept an optional `accept` string that is threaded through to the
    fhir-server so content negotiation is honoured end-to-end.

    The `generate()` method orchestrates three clients:
      1. ScheduleClient  — fetches the target Schedule to validate the
                           planningHorizon and resolve inherited arrays.
      2. PractitionerRoleClient — fetches specialty[] from the PractitionerRole
                                  actor when the Schedule has none of its own.
      3. SlotClient      — creates each generated Slot via individual POSTs.
    """

    def __init__(
        self,
        client: SlotClient,
        schedule_client: ScheduleClient,
        pr_client: PractitionerRoleClient,
    ) -> None:
        """
        Initialise with all three domain clients injected by the DI container.

        Args:
            client:          SlotClient for Slot CRUD operations.
            schedule_client: ScheduleClient for fetching the target Schedule.
            pr_client:       PractitionerRoleClient for resolving specialty from
                             a PractitionerRole actor.
        """
        self._client = client
        self._schedule_client = schedule_client
        self._pr_client = pr_client

    async def create(
        self,
        dto: SlotCreateSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Create a new Slot resource on the fhir-server.

        Serialises the DTO with exclude_none=True so empty Optional fields
        are not sent as explicit nulls. FhirClient.post() stamps created_by
        from actor.sub automatically — do not add it here.

        Args:
            dto:    Validated create input from the router.
            actor:  Authenticated caller — used by FhirClient for created_by.
            accept: Content-type preference forwarded to the fhir-server.

        Returns:
            The newly created Slot as a dict (plain JSON or FHIR depending on accept).
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        return await self._client.create(payload, actor, accept=accept)

    async def get_by_id(
        self,
        resource_id: int,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Fetch a single Slot by its integer primary key.

        Args:
            resource_id: The slot's integer ID on the fhir-server.
            actor:       Authenticated caller (kept for RBAC consistency — not used here).
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The Slot resource dict (plain JSON or FHIR depending on accept).
        """
        return await self._client.get_by_id(resource_id, accept=accept)

    async def list(
        self,
        filters: ListSlotsSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        List Slots with optional filters.

        Forwards all non-None filter values to SlotClient.list(), which strips
        remaining Nones before hitting the fhir-server.

        Available filters: status, schedule_id, practitioner_role_id, date, start_from, start_to, user_id, org_id.

        Args:
            filters: Validated query parameters from the router.
            actor:   Authenticated caller (kept for RBAC consistency — not used here).
            accept:  Content-type preference forwarded to the fhir-server.

        Returns:
            Paginated plain JSON or a FHIR Bundle depending on accept.
        """
        return await self._client.list(
            accept=accept,
            status=filters.status,
            schedule_id=filters.schedule_id,
            practitioner_role_id=filters.practitioner_role_id,
            date=filters.date,
            start_from=filters.start_from,
            start_to=filters.start_to,
            user_id=filters.user_id,
            org_id=filters.org_id,
            limit=filters.limit,
            offset=filters.offset,
        )

    async def update(
        self,
        resource_id: int,
        dto: SlotPatchSchema,
        actor: AuthUser,
        accept: str | None = None,
    ) -> dict:
        """
        Partially update a Slot resource.

        Rejects the request with 422 if the caller sends an empty body (all None)
        so the fhir-server receives a meaningful PATCH. FhirClient.patch() stamps
        updated_by from actor.sub automatically.

        Patchable fields: status, start, end, overbooked, comment, appointment_type_*.
        Arrays (identifier, serviceCategory, serviceType, specialty) and schedule
        reference are NOT patchable — delete and re-create the Slot to change those.

        Args:
            resource_id: The slot's integer primary key.
            dto:         Validated patch input; at least one field must be non-None.
            actor:       Authenticated caller — used by FhirClient for updated_by.
            accept:      Content-type preference forwarded to the fhir-server.

        Returns:
            The updated Slot resource dict (plain JSON or FHIR depending on accept).

        Raises:
            HTTPException(422): If the patch body is empty.
        """
        payload = dto.model_dump(exclude_none=True, mode="json")
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one field must be provided for update.",
            )
        return await self._client.patch(resource_id, payload, actor, accept=accept)

    async def delete(self, resource_id: int, actor: AuthUser) -> None:
        """
        Permanently delete a Slot and all its child records.

        The fhir-server cascades the delete to identifier, serviceCategory,
        serviceType, and specialty child tables. This operation is irreversible.

        Args:
            resource_id: The slot's integer primary key to delete.
            actor:       Authenticated caller (kept for RBAC consistency — not used here).
        """
        await self._client.delete(resource_id)

    async def generate(
        self,
        dto: SlotGenerateSchema,
        actor: AuthUser,
    ) -> SlotGenerateResponse:
        """
        Auto-generate Slot resources for a Schedule within a given time window.

        Steps:
          1. Fetch the Schedule and validate the generation window against its
             planningHorizon.
          2. Resolve service_category, service_type, and specialty in priority order:
               a. Caller-supplied overrides in the request body.
               b. Fields already stored on the Schedule resource.
               c. specialty[] from the PractitionerRole actor (if present on Schedule).
          3. Generate one time window per slot_duration_minutes interval.
          4. POST each window to the fhir-server as an individual Slot (status=free).
          5. Return a summary with created IDs and any per-slot errors (partial-failure
             model — successfully created slots are NOT rolled back on later failures).

        Args:
            dto:   Validated generate request from the router.
            actor: Authenticated caller — used by SlotClient to stamp created_by.

        Returns:
            SlotGenerateResponse with generated_count, slot_ids, and any errors.

        Raises:
            HTTPException(404): If the schedule_id does not exist.
            HTTPException(422): If the generation window falls outside the
                                planningHorizon, or no slots fit in the window.
        """
        # ── 1. Fetch the target Schedule ──────────────────────────────────────
        schedule = await self._schedule_client.get_by_id(dto.schedule_id)

        # ── 2. Validate generation window against planningHorizon ─────────────
        horizon_start_raw = schedule.get("planning_horizon_start")
        horizon_end_raw = schedule.get("planning_horizon_end")

        if horizon_start_raw:
            from datetime import datetime as _dt
            horizon_start = _dt.fromisoformat(horizon_start_raw.replace("Z", "+00:00"))
            # Strip tzinfo for naive comparison when dto datetimes are naive
            if dto.generation_start.tzinfo is None:
                horizon_start = horizon_start.replace(tzinfo=None)
            if dto.generation_start < horizon_start:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=(
                        f"generation_start ({dto.generation_start.isoformat()}) is before "
                        f"the schedule's planningHorizon start ({horizon_start_raw})."
                    ),
                )

        if horizon_end_raw:
            from datetime import datetime as _dt
            horizon_end = _dt.fromisoformat(horizon_end_raw.replace("Z", "+00:00"))
            if dto.generation_end.tzinfo is None:
                horizon_end = horizon_end.replace(tzinfo=None)
            if dto.generation_end > horizon_end:
                # Clamp to the planning horizon end rather than rejecting.
                # The client DatePicker appends T23:59:59 to any picked date; when
                # the user selects the last valid day we honour that intent by
                # capping at the actual horizon end instead of failing the request.
                dto = dto.model_copy(update={"generation_end": horizon_end})

        # ── 3. Resolve service_category, service_type, specialty ──────────────
        # Priority: caller override → Schedule fields → PractitionerRole actor

        service_category = dto.service_category
        if not service_category:
            raw_sc = schedule.get("service_category") or []
            service_category = (
                [SlotServiceCategoryInput(**c) for c in raw_sc] if raw_sc else None
            )

        service_type = dto.service_type
        if not service_type:
            raw_st = schedule.get("service_type") or []
            service_type = (
                [SlotServiceTypeInput(**t) for t in raw_st] if raw_st else None
            )

        specialty = dto.specialty
        if not specialty:
            raw_sp = schedule.get("specialty") or []
            specialty = (
                [SlotSpecialtyInput(**s) for s in raw_sp] if raw_sp else None
            )

            # Fall back to PractitionerRole actor when Schedule has no specialty
            if not specialty:
                pr_actor = next(
                    (
                        a for a in (schedule.get("actor") or [])
                        if a.get("reference_type") == "PractitionerRole"
                    ),
                    None,
                )
                if pr_actor and pr_actor.get("reference_id"):
                    pr = await self._pr_client.get_by_id(pr_actor["reference_id"])
                    pr_specialty = pr.get("specialty") or []
                    specialty = (
                        [SlotSpecialtyInput(**s) for s in pr_specialty]
                        if pr_specialty
                        else None
                    )

        # ── 4. Generate time windows ──────────────────────────────────────────
        duration = timedelta(minutes=dto.slot_duration_minutes)
        cursor = dto.generation_start
        windows: list[tuple] = []
        while cursor + duration <= dto.generation_end:
            windows.append((cursor, cursor + duration))
            cursor += duration

        if not windows:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"No slots can be generated: the window "
                    f"({dto.generation_start.isoformat()} → {dto.generation_end.isoformat()}) "
                    f"is shorter than slot_duration_minutes ({dto.slot_duration_minutes} min)."
                ),
            )

        # ── 5. Create each slot ───────────────────────────────────────────────
        schedule_ref = f"Schedule/{dto.schedule_id}"
        created_ids: list[int] = []
        errors: list[str] = []

        for start, end in windows:
            payload: dict = {
                "schedule": schedule_ref,
                "status": "free",
                "start": start.isoformat(),
                "end": end.isoformat(),
                "overbooked": dto.overbooked,
            }

            # Tenant scoping — only include when supplied
            if dto.user_id:
                payload["user_id"] = dto.user_id
            if dto.org_id:
                payload["org_id"] = dto.org_id

            # Optional comment
            if dto.comment:
                payload["comment"] = dto.comment

            # Appointment type (pre-set when all slots share the same type)
            if dto.appointment_type_code:
                payload["appointment_type_code"] = dto.appointment_type_code
            if dto.appointment_type_system:
                payload["appointment_type_system"] = dto.appointment_type_system
            if dto.appointment_type_display:
                payload["appointment_type_display"] = dto.appointment_type_display
            if dto.appointment_type_text:
                payload["appointment_type_text"] = dto.appointment_type_text

            # Resolved arrays
            if service_category:
                payload["service_category"] = [
                    c.model_dump(exclude_none=True) for c in service_category
                ]
            if service_type:
                payload["service_type"] = [
                    t.model_dump(exclude_none=True) for t in service_type
                ]
            if specialty:
                payload["specialty"] = [
                    s.model_dump(exclude_none=True) for s in specialty
                ]

            try:
                result = await self._client.create(payload, actor)
                created_ids.append(result["id"])
            except Exception as exc:
                errors.append(f"{start.isoformat()}: {exc}")

        return SlotGenerateResponse(
            schedule_id=dto.schedule_id,
            generated_count=len(created_ids),
            slot_ids=created_ids,
            generation_start=dto.generation_start,
            generation_end=dto.generation_end,
            slot_duration_minutes=dto.slot_duration_minutes,
            failed_count=len(errors),
            errors=errors,
        )
