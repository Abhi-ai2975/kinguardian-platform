"""
Input schemas for the Appointment resource endpoints.

Five schemas cover the write/query surfaces:
  - BookAppointmentInput     — POST /appointments/book simplified booking body
  - AppointmentCreateSchema  — POST /appointments body (raw FHIR create)
  - AppointmentPatchSchema   — PATCH /appointments/{id} body
  - ListAppointmentsSchema   — GET /appointments query parameters
  - MeAppointmentsSchema     — GET /appointments/me query parameters (no user_id/org_id)

All nested schemas (participant, slot, recurrence, etc.) are defined here
because the fhir-server manages them through the single POST body — there are
NO separate sub-resource routes for Appointment.

Design notes:
  - `participant` is required at creation time (min 1 entry).
  - `class_` uses alias="class" because `class` is a Python reserved word;
    callers send `{"class": [...]}` in JSON.
  - `created_by` / `updated_by` are NOT here — FhirClient injects from actor.sub.
  - `user_id` / `org_id` are Optional to match the fhir-server schema.
"""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.appointment.enums import AppointmentParticipantStatus, AppointmentStatus


# ── Identifier ────────────────────────────────────────────────────────────────


class AppointmentIdentifierInput(BaseModel):
    """Business identifier for the Appointment (e.g. booking reference number)."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[str] = Field(None, description="usual | official | temp | secondary | old")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = Field(None, description="URI of the identifier namespace.")
    value: Optional[str] = Field(None, description="The identifier value within the namespace.")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = Field(None, description="Organisation that issued the identifier.")


# ── Class ─────────────────────────────────────────────────────────────────────


class AppointmentClassInput(BaseModel):
    """
    Classification of the Appointment (R5 — care setting class such as ambulatory, inpatient).

    JSON key is `class` (Python reserved word — use alias).
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


# ── Service Category ──────────────────────────────────────────────────────────


class AppointmentServiceCategoryInput(BaseModel):
    """Broad categorisation of the service to be performed (e.g. surgical, diagnostic)."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


# ── Service Type ──────────────────────────────────────────────────────────────


class AppointmentServiceTypeInput(BaseModel):
    """
    Specific service type — CodeableReference.

    `reference` is a FHIR reference string e.g. `'HealthcareService/501'`.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference: Optional[str] = Field(None, description="FHIR reference e.g. 'HealthcareService/501'.")
    reference_display: Optional[str] = None


# ── Specialty ─────────────────────────────────────────────────────────────────


class AppointmentSpecialtyInput(BaseModel):
    """Clinical specialty of the practitioner required for this appointment."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


# ── Reason ────────────────────────────────────────────────────────────────────


class AppointmentReasonInput(BaseModel):
    """
    Reason for the appointment — CodeableReference.

    `reference` is a FHIR reference e.g. `'Condition/12345'`, `'Procedure/67890'`.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference: Optional[str] = Field(None, description="FHIR reference to Condition/Procedure/Observation/etc.")
    reference_display: Optional[str] = None


# ── Supporting Information ────────────────────────────────────────────────────


class AppointmentSupportingInformationInput(BaseModel):
    """Additional information to support the appointment (e.g. related documents)."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference e.g. 'DocumentReference/456'.")
    reference_display: Optional[str] = None


# ── Slot ─────────────────────────────────────────────────────────────────────


class AppointmentSlotInput(BaseModel):
    """The Slot resource that this appointment is filling."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference e.g. 'Slot/501'.")
    reference_display: Optional[str] = None


# ── Based On ─────────────────────────────────────────────────────────────────


class AppointmentBasedOnInput(BaseModel):
    """Service request or care plan that this appointment fulfils."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference e.g. 'ServiceRequest/80001' or 'CarePlan/500'.")
    reference_display: Optional[str] = None


# ── Replaces ─────────────────────────────────────────────────────────────────


class AppointmentReplacesInput(BaseModel):
    """
    Appointment that this appointment replaces (R5).

    Used when rescheduling — the prior appointment is cancelled and this one takes its place.
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference to the cancelled Appointment e.g. 'Appointment/40001'.")
    reference_display: Optional[str] = None


# ── Virtual Service ───────────────────────────────────────────────────────────


class AppointmentVirtualServiceInput(BaseModel):
    """
    Virtual meeting connection details for a telehealth appointment (R5).

    Captures the video/audio channel type and meeting URL.
    """

    model_config = ConfigDict(extra="forbid")

    channel_type_system: Optional[str] = None
    channel_type_code: Optional[str] = Field(None, description="Channel type code e.g. 'zoom', 'teams', 'webex'.")
    channel_type_display: Optional[str] = None
    address_url: Optional[str] = Field(None, description="Meeting URL for the virtual session.")
    additional_info: Optional[List[str]] = Field(None, description="Additional informational URLs.")
    max_participants: Optional[int] = Field(None, ge=1, description="Maximum number of concurrent participants.")
    session_key: Optional[str] = Field(None, description="Session key or PIN for the meeting.")


# ── Account ───────────────────────────────────────────────────────────────────


class AppointmentAccountInput(BaseModel):
    """Account to charge for this appointment (R5)."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference e.g. 'Account/601'.")
    reference_display: Optional[str] = None


# ── Note ─────────────────────────────────────────────────────────────────────


class AppointmentNoteInput(BaseModel):
    """
    Annotation note on the appointment (R5 — replaces R4 `comment` string).

    `text` is required. Author can be a string or a FHIR reference to a clinical user.
    """

    model_config = ConfigDict(extra="forbid")

    author_string: Optional[str] = Field(None, description="Plain text author name.")
    author_reference: Optional[str] = Field(None, description="FHIR reference to the author e.g. 'Practitioner/30001'.")
    author_reference_display: Optional[str] = None
    time: Optional[datetime] = Field(None, description="When the annotation was made.")
    text: str = Field(..., description="Annotation text (markdown supported).")


# ── Patient Instruction ───────────────────────────────────────────────────────


class AppointmentPatientInstructionInput(BaseModel):
    """
    Instructions for the patient prior to the appointment (R5 — CodeableReference).

    Can be coded (e.g. fasting instructions) or a document reference.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference: Optional[str] = Field(None, description="FHIR reference e.g. 'DocumentReference/456'.")
    reference_display: Optional[str] = None


# ── Participant Type ──────────────────────────────────────────────────────────


class AppointmentParticipantTypeInput(BaseModel):
    """
    Role played by a participant in the appointment (e.g. admitter, attender, PART).

    Maps to FHIR v3 ParticipationType codes.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


# ── Participant ───────────────────────────────────────────────────────────────


class AppointmentParticipantInput(BaseModel):
    """
    A participant in the appointment — required field with min_length=1.

    `reference` identifies the actor (Patient, Practitioner, Location, etc.) as a FHIR
    reference string e.g. `'Practitioner/30001'` or `'Patient/10001'`.

    `status` defaults to `needs-action` and is updated as participants confirm.
    """

    model_config = ConfigDict(extra="forbid")

    reference: Optional[str] = Field(None, description="FHIR reference to the actor e.g. 'Practitioner/30001'.")
    reference_display: Optional[str] = None
    types: Optional[List[AppointmentParticipantTypeInput]] = Field(None, description="Role(s) this actor plays.")
    required: Optional[bool] = Field(None, description="True if participation is required for the appointment to proceed.")
    status: Optional[AppointmentParticipantStatus] = Field(
        default=AppointmentParticipantStatus.needs_action,
        description="accepted | declined | tentative | needs-action",
    )
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ── Requested Period ──────────────────────────────────────────────────────────


class AppointmentRequestedPeriodInput(BaseModel):
    """Potential date/time interval when the appointment could be scheduled."""

    model_config = ConfigDict(extra="forbid")

    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ── Recurrence Templates ──────────────────────────────────────────────────────


class RecurrenceWeeklyTemplateInput(BaseModel):
    """Weekly recurrence pattern — specifies which days of the week and the interval."""

    model_config = ConfigDict(extra="forbid")

    monday: Optional[bool] = None
    tuesday: Optional[bool] = None
    wednesday: Optional[bool] = None
    thursday: Optional[bool] = None
    friday: Optional[bool] = None
    saturday: Optional[bool] = None
    sunday: Optional[bool] = None
    week_interval: Optional[int] = Field(None, ge=1, description="Repeat every N weeks.")


class RecurrenceMonthlyTemplateInput(BaseModel):
    """
    Monthly recurrence pattern.

    Either `day_of_month` (e.g. every 15th) or `nth_week_code` + `day_of_week_code`
    (e.g. every second Monday). `month_interval` is required.
    """

    model_config = ConfigDict(extra="forbid")

    day_of_month: Optional[int] = Field(None, ge=1, le=31, description="Specific calendar day (1–31).")
    nth_week_code: Optional[str] = Field(None, description="Ordinal week e.g. '1' (first), '2' (second), '-1' (last).")
    nth_week_display: Optional[str] = None
    day_of_week_code: Optional[str] = Field(None, description="Day of week code: mon|tue|wed|thu|fri|sat|sun.")
    day_of_week_display: Optional[str] = None
    month_interval: int = Field(..., ge=1, description="Repeat every N months.")


class RecurrenceYearlyTemplateInput(BaseModel):
    """Yearly recurrence pattern."""

    model_config = ConfigDict(extra="forbid")

    year_interval: int = Field(..., ge=1, description="Repeat every N years.")


class RecurrenceTemplateInput(BaseModel):
    """
    Template for a recurring series of Appointments (R5).

    Exactly one of `weekly_template`, `monthly_template`, or `yearly_template`
    should be provided to match `recurrence_type_code`.

    `recurrence_type_code` values: daily | weekly | monthly | yearly
    """

    model_config = ConfigDict(extra="forbid")

    recurrence_type_code: str = Field(..., description="Frequency: daily | weekly | monthly | yearly.")
    recurrence_type_display: Optional[str] = None
    recurrence_type_system: Optional[str] = None
    timezone_code: Optional[str] = Field(None, description="IANA timezone e.g. 'America/New_York'.")
    timezone_display: Optional[str] = None
    last_occurrence_date: Optional[date] = Field(None, description="Date after which no more occurrences are generated.")
    occurrence_count: Optional[int] = Field(None, ge=1, description="Total number of occurrences in the series.")
    occurrence_dates: Optional[List[date]] = Field(None, description="Explicit list of occurrence dates.")
    excluding_dates: Optional[List[date]] = Field(None, description="Dates to skip within the recurrence.")
    excluding_recurrence_ids: Optional[List[int]] = Field(None, description="Ordinal positions in the series to skip.")
    weekly_template: Optional[RecurrenceWeeklyTemplateInput] = None
    monthly_template: Optional[RecurrenceMonthlyTemplateInput] = None
    yearly_template: Optional[RecurrenceYearlyTemplateInput] = None


# ── Main Schemas ──────────────────────────────────────────────────────────────


class AppointmentCreateSchema(BaseModel):
    """
    Input schema for creating an Appointment resource (POST /appointments).

    `status` and `participant` (≥1 entry) are required. All other fields are optional.

    Child arrays (identifier, service_type, participant, slot, etc.) are embedded
    here because the fhir-server has NO separate sub-resource routes for Appointment.
    All child data is persisted through this single POST call.

    Notes:
      - `class_` uses alias="class" (Python reserved word); send {"class": [...]} in JSON.
      - `created_by` is NOT here — FhirClient injects it from actor.sub automatically.
      - `user_id`/`org_id` are Optional to match the fhir-server schema.
    """

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    # Tenant scoping
    user_id: Optional[str] = Field(None, description="User identifier for tenant scoping.")
    org_id: Optional[str] = Field(None, description="Organisation identifier for tenant scoping.")

    # Core scalar fields
    status: AppointmentStatus = Field(..., description="Lifecycle status — required.")
    start: Optional[datetime] = Field(None, description="Start time of the appointment (ISO 8601).")
    end: Optional[datetime] = Field(None, description="End time of the appointment (ISO 8601). Omit if using minutes_duration.")
    minutes_duration: Optional[int] = Field(None, ge=1, description="Duration in minutes — alternative to explicit `end`.")
    description: Optional[str] = Field(None, description="Shown on a subject line when booking the appointment.")
    created: Optional[datetime] = Field(None, description="When the appointment was initially created.")
    recurrence_id: Optional[int] = Field(None, ge=1, description="Ordinal position in a recurring series.")
    occurrence_changed: Optional[bool] = Field(None, description="True if this occurrence deviates from the series template (R5).")

    # Subject reference (R5 — Patient or Group)
    subject: Optional[str] = Field(None, description="FHIR reference to the patient/group e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    # Related appointment references (R5)
    encounter_id: Optional[int] = Field(None, description="Public encounter_id this appointment relates to.")
    previous_appointment_id: Optional[int] = Field(None, description="Public appointment_id of the immediately prior occurrence (R5).")
    previous_appointment_display: Optional[str] = None
    originating_appointment_id: Optional[int] = Field(None, description="Public appointment_id of the first in a recurring series (R5).")
    originating_appointment_display: Optional[str] = None

    # Cancellation reason / date
    cancelation_reason_system: Optional[str] = None
    cancelation_reason_code: Optional[str] = None
    cancelation_reason_display: Optional[str] = None
    cancelation_reason_text: Optional[str] = None
    cancellation_date: Optional[datetime] = Field(None, description="When the appointment was cancelled (R5).")

    # Appointment type
    appointment_type_system: Optional[str] = None
    appointment_type_code: Optional[str] = None
    appointment_type_display: Optional[str] = None
    appointment_type_text: Optional[str] = None

    # Priority (R5 — CodeableConcept; R4 used a plain integer)
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None

    # Child arrays — embedded in create body (no separate sub-routes on fhir-server)
    identifier: Optional[List[AppointmentIdentifierInput]] = None
    # `class` is a Python reserved word — callers send {"class": [...]} in JSON
    class_: Optional[List[AppointmentClassInput]] = Field(None, alias="class")
    service_category: Optional[List[AppointmentServiceCategoryInput]] = None
    service_type: Optional[List[AppointmentServiceTypeInput]] = None
    specialty: Optional[List[AppointmentSpecialtyInput]] = None
    reason: Optional[List[AppointmentReasonInput]] = None
    supporting_information: Optional[List[AppointmentSupportingInformationInput]] = None
    slot: Optional[List[AppointmentSlotInput]] = None
    based_on: Optional[List[AppointmentBasedOnInput]] = None
    replaces: Optional[List[AppointmentReplacesInput]] = None
    virtual_service: Optional[List[AppointmentVirtualServiceInput]] = None
    account: Optional[List[AppointmentAccountInput]] = None
    note: Optional[List[AppointmentNoteInput]] = None
    patient_instruction: Optional[List[AppointmentPatientInstructionInput]] = None

    # Participant is required — at least one must be provided
    participant: List[AppointmentParticipantInput] = Field(
        ...,
        min_length=1,
        description="Participants in the appointment. At least one is required.",
    )

    requested_period: Optional[List[AppointmentRequestedPeriodInput]] = None
    recurrence_template: Optional[RecurrenceTemplateInput] = None


class BookAppointmentInput(BaseModel):
    """
    Simplified input for POST /appointments/book.

    The caller provides only the essential booking facts — practitioner, slot, and
    patient. The service layer validates slot availability, constructs the full FHIR
    participant array, creates the Appointment, and marks the Slot as busy.

    This schema deliberately hides the raw FHIR complexity of AppointmentCreateSchema
    so that booking UIs don't need to understand participant arrays or slot references.

    Notes:
      - `created_by` is NOT here — FhirClient injects it from actor.sub automatically.
      - `slot_id` drives both the timing (start/end extracted from the Slot) and the
        Appointment.slot reference.
    """

    model_config = ConfigDict(extra="forbid")

    # ── Tenant scoping ────────────────────────────────────────────────────────
    user_id: Optional[str] = Field(None, description="User identifier for tenant scoping.")
    org_id: Optional[str] = Field(None, description="Organisation identifier for tenant scoping.")

    # ── Required booking identifiers ──────────────────────────────────────────
    practitioner_id: int = Field(..., description="Integer ID of the Practitioner to book with.")
    slot_id: int = Field(..., description="Integer ID of the free Slot to book. Must have status='free'.")
    patient_id: int = Field(..., description="Integer ID of the Patient being booked. Get from GET /patients/me.")

    # ── Display names — stored as participant reference_display ───────────────
    practitioner_display: Optional[str] = Field(
        None,
        description="Human-readable name of the practitioner. Stored as the Practitioner participant's reference_display.",
    )
    patient_display: Optional[str] = Field(
        None,
        description="Human-readable name of the patient. Stored as the Patient participant's reference_display.",
    )

    # ── Optional context ──────────────────────────────────────────────────────
    service_type_code: Optional[str] = Field(None, description="Service type code (e.g. SNOMED or local code).")
    service_type_display: Optional[str] = Field(None, description="Human-readable label for the service type code.")
    reason_code: Optional[str] = Field(None, description="Coded reason for the appointment (e.g. ICD-10 or SNOMED).")
    reason_text: Optional[str] = Field(None, description="Free-text reason for the appointment.")
    description: Optional[str] = Field(None, description="Subject line shown when viewing the appointment.")
    comment: Optional[str] = Field(None, description="Internal comment stored as an Appointment note.")


class AppointmentPatchSchema(BaseModel):
    """
    Input schema for partially updating an Appointment (PATCH /appointments/{id}).

    Only scalar fields are patchable. Child arrays (participants, slots, etc.) are
    immutable after creation on the fhir-server — they cannot be modified via PATCH.
    At least one field must be provided (enforced in the service layer).
    updated_by is NOT included — FhirClient injects it from actor.sub.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[AppointmentStatus] = None
    cancelation_reason_system: Optional[str] = None
    cancelation_reason_code: Optional[str] = None
    cancelation_reason_display: Optional[str] = None
    cancelation_reason_text: Optional[str] = None
    cancellation_date: Optional[datetime] = None
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    minutes_duration: Optional[int] = Field(None, ge=1)
    description: Optional[str] = None
    recurrence_id: Optional[int] = Field(None, ge=1)
    occurrence_changed: Optional[bool] = None


class ListAppointmentsSchema(BaseModel):
    """
    Query parameters for listing Appointments (GET /appointments).

    Filters by status, patient, time range, or tenant scoping. All filters optional.
    Admin callers may use `user_id`/`org_id` to scope queries across tenants.
    Regular callers should use GET /appointments/me instead.
    """

    status: Optional[AppointmentStatus] = Field(None, description="Filter by appointment lifecycle status.")
    patient_id: Optional[int] = Field(None, description="Filter appointments that include this patient (integer ID).")
    practitioner_id: Optional[int] = Field(None, description="Filter appointments where this practitioner is a participant (integer ID).")
    start_from: Optional[datetime] = Field(None, description="Return appointments starting at or after this datetime (ISO 8601).")
    start_to: Optional[datetime] = Field(None, description="Return appointments starting at or before this datetime (ISO 8601).")
    user_id: Optional[str] = Field(None, description="Filter by user_id for tenant scoping.")
    org_id: Optional[str] = Field(None, description="Filter by org_id for tenant scoping.")
    limit: int = Field(default=50, ge=1, le=200, description="Maximum number of records to return per page.")
    offset: int = Field(default=0, ge=0, description="Number of records to skip before returning results.")


class MeAppointmentsSchema(BaseModel):
    """
    Query parameters for GET /appointments/me.

    Filters the caller's own appointments (user_id is taken from the JWT — not a parameter).
    """

    status: Optional[AppointmentStatus] = Field(None, description="Filter by appointment lifecycle status.")
    start_from: Optional[datetime] = Field(None, description="Return appointments starting at or after this datetime.")
    start_to: Optional[datetime] = Field(None, description="Return appointments starting at or before this datetime.")
    limit: int = Field(default=50, ge=1, le=200, description="Maximum number of records to return per page.")
    offset: int = Field(default=0, ge=0, description="Number of records to skip before returning results.")


class RescheduleAppointmentInput(BaseModel):
    """
    Input schema for POST /appointments/{id}/reschedule.

    The caller provides only the new slot ID. The service fetches the current
    appointment to discover the old slot reference, validates the new slot is free,
    then atomically swaps the timing and slot statuses.

    Only `new_slot_id` is required — the service derives everything else from
    the existing appointment and the new slot's own start/end times.

    Note: the appointment's internal slot reference array is immutable on the
    fhir-server (child arrays cannot be patched), so only the appointment's
    `start`/`end` fields are updated to reflect the new slot's timing.
    """

    model_config = ConfigDict(extra="forbid")

    # The slot the appointment should be moved to.
    # Must be status='free' at the time of the reschedule call.
    new_slot_id: int = Field(..., description="Integer ID of the new free Slot to move this appointment to. Must have status='free'.")
