"""
Plain JSON response schemas for the Appointment resource.

These models document the fhir-server's plain (non-FHIR) JSON output shape —
what the caller receives when `Accept: application/json` (the default).

`extra="allow"` on every model so new fhir-server fields pass through without
requiring a schema bump here.

For the FHIR R4 camelCase shape (when `Accept: application/fhir+json`),
see fhir_schemas.py.

Reference: https://hl7.org/fhir/R4/appointment.html
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Child-array plain response models ─────────────────────────────────────────


class PlainAppointmentIdentifier(BaseModel):
    """Plain JSON representation of an Appointment business identifier."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    assigner: Optional[str] = None


class PlainAppointmentClass(BaseModel):
    """Plain JSON representation of an Appointment class entry (R5)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentServiceCategory(BaseModel):
    """Plain JSON representation of an Appointment service category."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentServiceType(BaseModel):
    """Plain JSON representation of an Appointment service type (CodeableReference)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentSpecialty(BaseModel):
    """Plain JSON representation of a clinical specialty for the Appointment."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentReason(BaseModel):
    """Plain JSON representation of an Appointment reason (CodeableReference)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentSupportingInformation(BaseModel):
    """Plain JSON representation of supporting information for an Appointment."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentSlot(BaseModel):
    """Plain JSON representation of a Slot linked to an Appointment."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentBasedOn(BaseModel):
    """Plain JSON representation of a request/plan that this Appointment fulfils."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentReplaces(BaseModel):
    """Plain JSON representation of an Appointment that this one replaces (R5)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentVirtualService(BaseModel):
    """Plain JSON representation of virtual meeting connection details (R5)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    channel_type_system: Optional[str] = None
    channel_type_code: Optional[str] = None
    channel_type_display: Optional[str] = None
    address_url: Optional[str] = None
    additional_info: Optional[str] = None
    max_participants: Optional[int] = None
    session_key: Optional[str] = None


class PlainAppointmentAccount(BaseModel):
    """Plain JSON representation of an Account to charge for the Appointment (R5)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentNote(BaseModel):
    """Plain JSON representation of an annotation note on an Appointment (R5)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None
    time: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentPatientInstruction(BaseModel):
    """Plain JSON representation of pre-appointment patient instructions (R5 CodeableReference)."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentParticipantType(BaseModel):
    """Plain JSON representation of a participant role type."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentParticipant(BaseModel):
    """
    Plain JSON representation of an Appointment participant.

    Includes the nested `types` list (roles played by this actor).
    """

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None
    required: Optional[bool] = None
    status: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    types: Optional[List[PlainAppointmentParticipantType]] = None


class PlainAppointmentRequestedPeriod(BaseModel):
    """Plain JSON representation of a requested period for scheduling."""

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainAppointmentRecurrenceTemplate(BaseModel):
    """
    Plain JSON representation of a recurrence template (R5 — one-to-one with Appointment).

    All weekly/monthly/yearly sub-fields are stored flat on the same table row.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    org_id: Optional[str] = None
    recurrence_type_code: Optional[str] = None
    recurrence_type_display: Optional[str] = None
    recurrence_type_system: Optional[str] = None
    timezone_code: Optional[str] = None
    timezone_display: Optional[str] = None
    last_occurrence_date: Optional[str] = None
    occurrence_count: Optional[int] = None
    occurrence_dates: Optional[str] = None
    excluding_dates: Optional[str] = None
    excluding_recurrence_ids: Optional[str] = None
    # Weekly pattern
    weekly_monday: Optional[bool] = None
    weekly_tuesday: Optional[bool] = None
    weekly_wednesday: Optional[bool] = None
    weekly_thursday: Optional[bool] = None
    weekly_friday: Optional[bool] = None
    weekly_saturday: Optional[bool] = None
    weekly_sunday: Optional[bool] = None
    weekly_week_interval: Optional[int] = None
    # Monthly pattern
    monthly_day_of_month: Optional[int] = None
    monthly_nth_week_code: Optional[str] = None
    monthly_nth_week_display: Optional[str] = None
    monthly_day_of_week_code: Optional[str] = None
    monthly_day_of_week_display: Optional[str] = None
    monthly_month_interval: Optional[int] = None
    # Yearly pattern
    yearly_year_interval: Optional[int] = None


# ── Top-level response ────────────────────────────────────────────────────────


class AppointmentResponse(BaseModel):
    """
    Full plain JSON response for a single Appointment resource.

    All child arrays are typed so Swagger renders their fields correctly.
    `extra="allow"` and `populate_by_name=True` ensure the `class` JSON key
    from the fhir-server maps to `class_` without dropping the field.
    """

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    minutes_duration: Optional[int] = None
    description: Optional[str] = None
    created: Optional[str] = None
    recurrence_id: Optional[int] = None
    occurrence_changed: Optional[bool] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_id: Optional[int] = None
    previous_appointment_id: Optional[int] = None
    previous_appointment_display: Optional[str] = None
    originating_appointment_id: Optional[int] = None
    originating_appointment_display: Optional[str] = None
    cancelation_reason_system: Optional[str] = None
    cancelation_reason_code: Optional[str] = None
    cancelation_reason_display: Optional[str] = None
    cancelation_reason_text: Optional[str] = None
    cancellation_date: Optional[str] = None
    appointment_type_system: Optional[str] = None
    appointment_type_code: Optional[str] = None
    appointment_type_display: Optional[str] = None
    appointment_type_text: Optional[str] = None
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None

    # Child arrays
    identifier: Optional[List[PlainAppointmentIdentifier]] = None
    class_: Optional[List[PlainAppointmentClass]] = Field(None, alias="class")
    service_category: Optional[List[PlainAppointmentServiceCategory]] = None
    service_type: Optional[List[PlainAppointmentServiceType]] = None
    specialty: Optional[List[PlainAppointmentSpecialty]] = None
    reason: Optional[List[PlainAppointmentReason]] = None
    supporting_information: Optional[List[PlainAppointmentSupportingInformation]] = None
    slot: Optional[List[PlainAppointmentSlot]] = None
    based_on: Optional[List[PlainAppointmentBasedOn]] = None
    replaces: Optional[List[PlainAppointmentReplaces]] = None
    virtual_service: Optional[List[PlainAppointmentVirtualService]] = None
    account: Optional[List[PlainAppointmentAccount]] = None
    note: Optional[List[PlainAppointmentNote]] = None
    patient_instruction: Optional[List[PlainAppointmentPatientInstruction]] = None
    participant: Optional[List[PlainAppointmentParticipant]] = None
    requested_period: Optional[List[PlainAppointmentRequestedPeriod]] = None
    # One-to-one with appointment — optional single object (not array)
    recurrence_template: Optional[PlainAppointmentRecurrenceTemplate] = None

    # Audit fields
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedAppointmentResponse(BaseModel):
    """
    Paginated list response for GET /appointments and GET /appointments/me.

    `total` reflects the count across ALL pages, not just this page.
    """

    total: int
    limit: int
    offset: int
    data: List[AppointmentResponse]
