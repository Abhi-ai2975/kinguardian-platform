from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.appointment.enums import (
    AppointmentParticipantStatus,
    AppointmentStatus,
)


class AppointmentIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class AppointmentClassInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class AppointmentServiceCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class AppointmentServiceTypeInput(BaseModel):
    """serviceType[] CodeableReference(HealthcareService) — concept OR reference (or both)."""
    model_config = ConfigDict(extra="forbid")
    # concept (CodeableConcept)
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    # reference
    reference: Optional[str] = Field(
        None,
        description="FHIR reference e.g. 'HealthcareService/501'.",
    )
    reference_display: Optional[str] = None


class AppointmentSpecialtyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class AppointmentReasonInput(BaseModel):
    """reason[] CodeableReference — concept OR reference (or both)."""
    model_config = ConfigDict(extra="forbid")
    # concept (CodeableConcept)
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    # reference
    reference: Optional[str] = Field(
        None,
        description="FHIR reference e.g. 'Condition/12345'.",
    )
    reference_display: Optional[str] = None


class AppointmentSupportingInformationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="FHIR reference to any supporting resource, e.g. 'DocumentReference/456'.",
    )
    reference_display: Optional[str] = None


class AppointmentSlotInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Slot/501'.")
    reference_display: Optional[str] = None


class AppointmentBasedOnInput(BaseModel):
    """basedOn[] Reference(CarePlan|DeviceRequest|MedicationRequest|ServiceRequest|RequestOrchestration|NutritionOrder|VisionPrescription)."""
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'ServiceRequest/80001' or 'CarePlan/500'.",
    )
    reference_display: Optional[str] = None


class AppointmentReplacesInput(BaseModel):
    """replaces[] Reference(Appointment) — R5 new."""
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Appointment/40001'.")
    reference_display: Optional[str] = None


class AppointmentVirtualServiceInput(BaseModel):
    """virtualService[] VirtualServiceDetail — R5 new."""
    model_config = ConfigDict(extra="forbid")
    channel_type_system: Optional[str] = None
    channel_type_code: Optional[str] = Field(None, description="e.g. 'zoom' | 'teams' | 'webex'")
    channel_type_display: Optional[str] = None
    address_url: Optional[str] = Field(None, description="Meeting URL.")
    additional_info: Optional[List[str]] = Field(None, description="Additional informational URLs.")
    max_participants: Optional[int] = Field(None, ge=1)
    session_key: Optional[str] = None


class AppointmentAccountInput(BaseModel):
    """account[] Reference(Account) — R5 new."""
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Account/601'.")
    reference_display: Optional[str] = None


class AppointmentNoteInput(BaseModel):
    """note[] Annotation — R5 replaces comment string."""
    model_config = ConfigDict(extra="forbid")
    # author[x]: provide one of author_string OR author_reference
    author_string: Optional[str] = Field(None, description="Author as a plain text name.")
    author_reference: Optional[str] = Field(
        None, description="Author as a FHIR reference e.g. 'Practitioner/30001'."
    )
    author_reference_display: Optional[str] = None
    time: Optional[datetime] = None
    text: str = Field(..., description="Annotation text content (markdown).")


class AppointmentPatientInstructionInput(BaseModel):
    """patientInstruction[] CodeableReference — R5 replaces string."""
    model_config = ConfigDict(extra="forbid")
    # concept
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    # reference
    reference: Optional[str] = Field(
        None, description="FHIR reference e.g. 'DocumentReference/456'."
    )
    reference_display: Optional[str] = None


class AppointmentParticipantTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class AppointmentParticipantInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: Optional[str] = Field(
        None,
        description="FHIR reference using the public resource ID, e.g. 'Practitioner/30001' or 'Patient/10001'.",
    )
    reference_display: Optional[str] = None
    types: Optional[List[AppointmentParticipantTypeInput]] = Field(
        None,
        description="Participant role code(s), e.g. [{coding_code: 'ATND', coding_display: 'attender'}].",
    )
    required: Optional[bool] = Field(None, description="True if participation is required.")
    status: AppointmentParticipantStatus = Field(
        AppointmentParticipantStatus.needs_action,
        description="Participation acceptance status.",
    )
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class AppointmentRequestedPeriodInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ── Recurrence template (operational, not FHIR R5 standard) ──────────────────


class RecurrenceWeeklyTemplateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    monday: Optional[bool] = None
    tuesday: Optional[bool] = None
    wednesday: Optional[bool] = None
    thursday: Optional[bool] = None
    friday: Optional[bool] = None
    saturday: Optional[bool] = None
    sunday: Optional[bool] = None
    week_interval: Optional[int] = Field(None, ge=1, description="Weeks between occurrences.")


class RecurrenceMonthlyTemplateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    day_of_month: Optional[int] = Field(None, ge=1, le=31)
    nth_week_code: Optional[str] = Field(None, description="e.g. '1' (1st week) or '-1' (last week).")
    nth_week_display: Optional[str] = None
    day_of_week_code: Optional[str] = Field(None, description="mon | tue | wed | thu | fri | sat | sun")
    day_of_week_display: Optional[str] = None
    month_interval: int = Field(..., ge=1, description="Months between occurrences.")


class RecurrenceYearlyTemplateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    year_interval: int = Field(..., ge=1, description="Years between occurrences.")


class RecurrenceTemplateInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    recurrence_type_code: str = Field(..., description="daily | weekly | monthly | yearly", examples=["weekly"])
    recurrence_type_display: Optional[str] = None
    recurrence_type_system: Optional[str] = None
    timezone_code: Optional[str] = Field(None, description="IANA timezone, e.g. 'America/New_York'.")
    timezone_display: Optional[str] = None
    last_occurrence_date: Optional[date] = Field(None, description="Date after which no more occurrences.")
    occurrence_count: Optional[int] = Field(None, ge=1, description="Total number of occurrences.")
    occurrence_dates: Optional[List[date]] = Field(None, description="Explicit list of occurrence dates.")
    excluding_dates: Optional[List[date]] = Field(None, description="Dates within the series to skip.")
    excluding_recurrence_ids: Optional[List[int]] = Field(None, description="Ordinal occurrence positions to skip.")
    weekly_template: Optional[RecurrenceWeeklyTemplateInput] = None
    monthly_template: Optional[RecurrenceMonthlyTemplateInput] = None
    yearly_template: Optional[RecurrenceYearlyTemplateInput] = None


# ── Create / Patch ────────────────────────────────────────────────────────────


class AppointmentCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "status": "booked",
                "subject": "Patient/10001",
                "subject_display": "John Doe",
                "encounter_id": 20001,
                "start": "2026-06-01T09:00:00Z",
                "end": "2026-06-01T09:30:00Z",
                "minutes_duration": 30,
                "description": "Follow-up visit for hypertension management",
                "service_type": [{"coding_code": "57", "coding_display": "Immunisation"}],
                "specialty": [{"coding_code": "394814009", "coding_display": "General practice"}],
                "reason": [{"coding_code": "274640006", "coding_display": "Fever"}],
                "note": [{"text": "Patient prefers morning appointments.", "author_string": "Dr. Smith"}],
                "participant": [
                    {
                        "reference": "Patient/10001",
                        "reference_display": "John Doe",
                        "required": True,
                        "status": "accepted",
                    },
                    {
                        "reference": "Practitioner/30001",
                        "reference_display": "Dr. Smith",
                        "types": [{"coding_code": "ATND", "coding_display": "attender"}],
                        "required": True,
                        "status": "accepted",
                    },
                ],
            }
        },
    )

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    status: AppointmentStatus

    # cancellationReason (0..1 CodeableConcept)
    cancelation_reason_system: Optional[str] = None
    cancelation_reason_code: Optional[str] = None
    cancelation_reason_display: Optional[str] = None
    cancelation_reason_text: Optional[str] = None

    # cancellationDate (0..1) — R5 new
    cancellation_date: Optional[datetime] = None

    # appointmentType (0..1 CodeableConcept)
    appointment_type_system: Optional[str] = None
    appointment_type_code: Optional[str] = None
    appointment_type_display: Optional[str] = None
    appointment_type_text: Optional[str] = None

    # priority (0..1 CodeableConcept) — R5
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None

    # subject (0..1 Reference(Patient|Group))
    subject: Optional[str] = Field(None, description="'Patient/10001' or 'Group/200'")
    subject_display: Optional[str] = None

    # encounter (operational FK)
    encounter_id: Optional[int] = Field(None, description="Public encounter_id.")

    # previousAppointment / originatingAppointment — R5 new
    previous_appointment_id: Optional[int] = Field(None, description="Public appointment_id.")
    previous_appointment_display: Optional[str] = None
    originating_appointment_id: Optional[int] = Field(None, description="Public appointment_id.")
    originating_appointment_display: Optional[str] = None

    # scheduling
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    minutes_duration: Optional[int] = Field(None, ge=1)
    created: Optional[datetime] = Field(None, description="When this appointment was initially created.")

    # descriptive
    description: Optional[str] = None

    # recurrenceId / occurrenceChanged — R5 new
    recurrence_id: Optional[int] = Field(None, ge=1, description="Ordinal position in a recurring series.")
    occurrence_changed: Optional[bool] = None

    # sub-resources (arrays)
    identifier: Optional[List[AppointmentIdentifierInput]] = None
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
    participant: List[AppointmentParticipantInput] = Field(..., min_length=1)
    requested_period: Optional[List[AppointmentRequestedPeriodInput]] = None
    recurrence_template: Optional[RecurrenceTemplateInput] = None


class AppointmentPatchSchema(BaseModel):
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
    updated_by: Optional[str] = None
