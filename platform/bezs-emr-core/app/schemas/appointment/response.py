from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRIdentifier,
    FHIRPeriod,
    FHIRReference,
)


# ── FHIR sub-types ─────────────────────────────────────────────────────────────


class FHIRCodeableReference(BaseModel):
    """R5 CodeableReference — concept (CodeableConcept) and/or reference (Reference)."""
    concept: Optional[FHIRCodeableConcept] = None
    reference: Optional[FHIRReference] = None


class FHIRAnnotation(BaseModel):
    """R5 Annotation datatype."""
    authorString: Optional[str] = None
    authorReference: Optional[FHIRReference] = None
    time: Optional[str] = None
    text: str


class FHIRVirtualServiceDetail(BaseModel):
    """R5 VirtualServiceDetail datatype."""
    channelType: Optional[dict] = None
    addressUrl: Optional[str] = None
    additionalInfo: Optional[List[str]] = None
    maxParticipants: Optional[int] = None
    sessionKey: Optional[str] = None


class FHIRAppointmentParticipant(BaseModel):
    type: Optional[List[FHIRCodeableConcept]] = None
    actor: Optional[FHIRReference] = None
    required: Optional[bool] = Field(None, description="True if participation is required (R5 boolean).")
    status: str = Field(..., description="accepted | declined | tentative | needs-action")
    period: Optional[FHIRPeriod] = None


# ── FHIR recurrence template (operational extension) ──────────────────────────


class FHIRRecurrenceWeeklyTemplate(BaseModel):
    monday: Optional[bool] = None
    tuesday: Optional[bool] = None
    wednesday: Optional[bool] = None
    thursday: Optional[bool] = None
    friday: Optional[bool] = None
    saturday: Optional[bool] = None
    sunday: Optional[bool] = None
    weekInterval: Optional[int] = None


class FHIRRecurrenceMonthlyTemplate(BaseModel):
    dayOfMonth: Optional[int] = None
    nthWeekOfMonth: Optional[dict] = None
    dayOfWeek: Optional[dict] = None
    monthInterval: Optional[int] = None


class FHIRRecurrenceTemplate(BaseModel):
    recurrenceType: Optional[FHIRCodeableConcept] = None
    timezone: Optional[FHIRCodeableConcept] = None
    lastOccurrenceDate: Optional[str] = None
    occurrenceCount: Optional[int] = None
    occurrenceDates: Optional[List[str]] = None
    excludingDate: Optional[List[str]] = None
    excludingRecurrenceId: Optional[List[int]] = None
    weeklyTemplate: Optional[FHIRRecurrenceWeeklyTemplate] = None
    monthlyTemplate: Optional[FHIRRecurrenceMonthlyTemplate] = None
    yearlyTemplate: Optional[dict] = None


# ── FHIR Appointment response ─────────────────────────────────────────────────


class FHIRAppointmentSchema(BaseModel):
    resourceType: str = Field("Appointment", description="Always 'Appointment'.")
    id: str = Field(..., description="Public appointment_id as a string.")
    status: str = Field(
        ...,
        description="proposed | pending | booked | arrived | fulfilled | cancelled | noshow | entered-in-error | checked-in | waitlist",
    )
    identifier: Optional[List[FHIRIdentifier]] = None
    cancellationReason: Optional[FHIRCodeableConcept] = None
    class_: Optional[List[FHIRCodeableConcept]] = Field(None, alias="class")
    serviceCategory: Optional[List[FHIRCodeableConcept]] = None
    serviceType: Optional[List[FHIRCodeableConcept]] = None
    specialty: Optional[List[FHIRCodeableConcept]] = None
    appointmentType: Optional[FHIRCodeableConcept] = None
    reason: Optional[List[FHIRCodeableReference]] = None
    priority: Optional[FHIRCodeableConcept] = None
    supportingInformation: Optional[List[FHIRReference]] = None
    description: Optional[str] = None
    replaces: Optional[List[FHIRReference]] = None
    virtualService: Optional[List[FHIRVirtualServiceDetail]] = None
    previousAppointment: Optional[FHIRReference] = None
    originatingAppointment: Optional[FHIRReference] = None
    slot: Optional[List[FHIRReference]] = None
    account: Optional[List[FHIRReference]] = None
    created: Optional[str] = None
    cancellationDate: Optional[str] = None
    note: Optional[List[FHIRAnnotation]] = None
    patientInstruction: Optional[List[FHIRCodeableReference]] = None
    basedOn: Optional[List[FHIRReference]] = None
    subject: Optional[FHIRReference] = None
    encounter: Optional[FHIRReference] = None
    start: Optional[str] = None
    end: Optional[str] = None
    minutesDuration: Optional[int] = None
    requestedPeriod: Optional[List[FHIRPeriod]] = None
    participant: List[FHIRAppointmentParticipant] = Field(..., description="At least one participant is required.")
    recurrenceId: Optional[int] = None
    occurrenceChanged: Optional[bool] = None
    recurrenceTemplate: Optional[FHIRRecurrenceTemplate] = None

    model_config = {"populate_by_name": True}


class FHIRAppointmentBundleEntry(BaseModel):
    resource: FHIRAppointmentSchema


class FHIRAppointmentBundle(FHIRBundle):
    entry: Optional[List[FHIRAppointmentBundleEntry]] = None


# ── Plain (snake_case) sub-types ───────────────────────────────────────────────


class PlainAppointmentIdentifier(BaseModel):
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
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentServiceCategory(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentServiceType(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentSpecialty(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentReason(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentSupportingInformation(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentSlot(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentBasedOn(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentReplaces(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentVirtualService(BaseModel):
    channel_type_system: Optional[str] = None
    channel_type_code: Optional[str] = None
    channel_type_display: Optional[str] = None
    address_url: Optional[str] = None
    additional_info: Optional[List[str]] = None
    max_participants: Optional[int] = None
    session_key: Optional[str] = None


class PlainAppointmentAccount(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentNote(BaseModel):
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None
    time: Optional[str] = None
    text: str


class PlainAppointmentPatientInstruction(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainAppointmentParticipantType(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAppointmentParticipant(BaseModel):
    reference_type: Optional[str] = Field(None, description="e.g. 'Practitioner' | 'Patient'")
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None
    types: Optional[List[PlainAppointmentParticipantType]] = None
    required: Optional[bool] = Field(None, description="True if participation is required.")
    status: Optional[str] = Field(None, description="accepted | declined | tentative | needs-action")
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainAppointmentRequestedPeriod(BaseModel):
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainWeeklyTemplate(BaseModel):
    monday: Optional[bool] = None
    tuesday: Optional[bool] = None
    wednesday: Optional[bool] = None
    thursday: Optional[bool] = None
    friday: Optional[bool] = None
    saturday: Optional[bool] = None
    sunday: Optional[bool] = None
    week_interval: Optional[int] = None


class PlainMonthlyTemplate(BaseModel):
    day_of_month: Optional[int] = None
    nth_week_code: Optional[str] = None
    nth_week_display: Optional[str] = None
    day_of_week_code: Optional[str] = None
    day_of_week_display: Optional[str] = None
    month_interval: Optional[int] = None


class PlainYearlyTemplate(BaseModel):
    year_interval: Optional[int] = None


class PlainRecurrenceTemplate(BaseModel):
    recurrence_type_code: Optional[str] = None
    recurrence_type_display: Optional[str] = None
    recurrence_type_system: Optional[str] = None
    timezone_code: Optional[str] = None
    timezone_display: Optional[str] = None
    last_occurrence_date: Optional[str] = None
    occurrence_count: Optional[int] = None
    occurrence_dates: Optional[List[str]] = None
    excluding_dates: Optional[List[str]] = None
    excluding_recurrence_ids: Optional[List[int]] = None
    weekly_template: Optional[PlainWeeklyTemplate] = None
    monthly_template: Optional[PlainMonthlyTemplate] = None
    yearly_template: Optional[PlainYearlyTemplate] = None


# ── Plain Appointment response ─────────────────────────────────────────────────


class PlainAppointmentResponse(BaseModel):
    id: int = Field(..., description="Public appointment_id.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: Optional[str] = None
    # cancellationReason fields
    cancelation_reason_system: Optional[str] = None
    cancelation_reason_code: Optional[str] = None
    cancelation_reason_display: Optional[str] = None
    cancelation_reason_text: Optional[str] = None
    cancellation_date: Optional[str] = None
    # appointmentType fields
    appointment_type_system: Optional[str] = None
    appointment_type_code: Optional[str] = None
    appointment_type_display: Optional[str] = None
    appointment_type_text: Optional[str] = None
    # priority (CodeableConcept)
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None
    # subject
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    # encounter
    encounter_id: Optional[int] = Field(None, description="Public encounter_id of the linked Encounter.")
    # previousAppointment / originatingAppointment
    previous_appointment_id: Optional[int] = None
    previous_appointment_display: Optional[str] = None
    originating_appointment_id: Optional[int] = None
    originating_appointment_display: Optional[str] = None
    # scheduling
    start: Optional[str] = None
    end: Optional[str] = None
    minutes_duration: Optional[int] = None
    created: Optional[str] = None
    # descriptive
    description: Optional[str] = None
    recurrence_id: Optional[int] = None
    occurrence_changed: Optional[bool] = None
    # sub-resources
    identifier: Optional[List[PlainAppointmentIdentifier]] = None
    class_: Optional[List[PlainAppointmentClass]] = None
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
    recurrence_template: Optional[PlainRecurrenceTemplate] = None
    # audit
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# ── Paginated response ─────────────────────────────────────────────────────────


class PaginatedAppointmentResponse(BaseModel):
    total: int = Field(..., description="Total number of matching appointments.")
    limit: int = Field(..., description="Page size requested.")
    offset: int = Field(..., description="Number of records skipped.")
    data: List[PlainAppointmentResponse] = Field(..., description="Array of plain-JSON Appointment objects.")
