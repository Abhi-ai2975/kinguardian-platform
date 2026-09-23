"""
Input schemas for the Encounter resource endpoints.

Three schemas cover the write/query surfaces:
  - EncounterCreateSchema  — POST /encounters body (all child arrays inline)
  - EncounterPatchSchema   — PATCH /encounters/{id} body (scalar fields only)
  - ListEncountersSchema   — GET /encounters query parameters

Design notes:
  - `class_` uses alias="class" because `class` is a Python reserved word;
    callers send `{"class": [...]}` in JSON.
  - `created_by` / `updated_by` are NOT here — FhirClient injects from actor.sub.
  - `user_id` / `org_id` are Optional to match the fhir-server schema.
  - All child arrays live in the POST body — the fhir-server has no separate
    sub-resource routes for Encounter.
  - Mirrors the fhir-server's EncounterCreateSchema / EncounterPatchSchema exactly
    to avoid silent failures at the fhir-server boundary.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Shared CodeableConcept input ──────────────────────────────────────────────


class _CodeableConceptInput(BaseModel):
    """Reusable flat CodeableConcept — system, code, display, text."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


# ── Sub-resource input schemas ────────────────────────────────────────────────


class EncounterIdentifierInput(BaseModel):
    """Business identifier for the Encounter (e.g. visit number)."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[str] = Field(None, description="usual | official | temp | secondary | old")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: str = Field(..., description="Identifier value — required.")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class EncounterStatusHistoryInput(BaseModel):
    """
    A past status in the Encounter's lifecycle.

    status must be one of: planned | in-progress | on-hold | discharged |
    completed | cancelled | discontinued | entered-in-error | unknown
    """

    model_config = ConfigDict(extra="forbid")

    status: str = Field(..., description="R5 status value for this history entry.")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class EncounterClassHistoryInput(BaseModel):
    """
    classHistory — R4 backward-compat element; removed in R5 but kept here for
    systems still on R4 or hybrid deployments.
    """

    model_config = ConfigDict(extra="forbid")

    class_system: Optional[str] = None
    class_version: Optional[str] = None
    class_code: str = Field(..., description="Class code, e.g. 'AMB', 'IMP', 'EMER'.")
    class_display: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class EncounterClassInput(_CodeableConceptInput):
    """class[] (0..*) CodeableConcept — R5 changed from 0..1 Coding."""


class EncounterBusinessStatusInput(BaseModel):
    """businessStatus[] (0..*) BackboneElement — R5 workflow status tracking."""

    model_config = ConfigDict(extra="forbid")

    code_system: Optional[str] = None
    code_code: str = Field(..., description="Business status code — required.")
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    effective_date: Optional[datetime] = None


class EncounterServiceTypeInput(BaseModel):
    """serviceType[] (0..*) CodeableReference(HealthcareService) — R5 type."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference: Optional[str] = Field(None, description="FHIR reference, e.g. 'HealthcareService/501'.")
    reference_display: Optional[str] = None


class EncounterTypeInput(_CodeableConceptInput):
    """type[] (0..*) CodeableConcept — clinical type of the encounter."""


class EncounterEpisodeOfCareInput(BaseModel):
    """episodeOfCare[] (0..*) Reference(EpisodeOfCare)."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference, e.g. 'EpisodeOfCare/501'.")
    reference_display: Optional[str] = None


class EncounterBasedOnInput(BaseModel):
    """basedOn[] (0..*) Reference(ServiceRequest | CarePlan)."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference, e.g. 'ServiceRequest/80001' or 'CarePlan/500'.")
    reference_display: Optional[str] = None


class EncounterCareTeamInput(BaseModel):
    """careTeam[] (0..*) Reference(CareTeam) — R5 new."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference, e.g. 'CareTeam/501'.")
    reference_display: Optional[str] = None


class EncounterParticipantTypeInput(_CodeableConceptInput):
    """participant.type[] (0..*) CodeableConcept — role in the encounter."""


class EncounterParticipantInput(BaseModel):
    """
    A participant in the Encounter — practitioner, patient, related person, etc.

    `reference` uses FHIR reference string format e.g. 'Practitioner/30001'.
    Allowed resource types: Patient | Group | RelatedPerson | Practitioner |
    PractitionerRole | Device | HealthcareService.
    """

    model_config = ConfigDict(extra="forbid")

    type: Optional[List[EncounterParticipantTypeInput]] = None
    reference: Optional[str] = Field(
        None,
        description="FHIR actor reference, e.g. 'Practitioner/30001' or 'Patient/10001'.",
    )
    reference_display: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class EncounterAppointmentRefInput(BaseModel):
    """appointment[] (0..*) Reference(Appointment) — linked appointment(s)."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference, e.g. 'Appointment/40001'.")
    reference_display: Optional[str] = None


class EncounterVirtualServiceInput(BaseModel):
    """virtualService[] (0..*) VirtualServiceDetail — R5 telehealth connection info."""

    model_config = ConfigDict(extra="forbid")

    channel_type_system: Optional[str] = None
    channel_type_code: Optional[str] = Field(None, description="Channel type code, e.g. 'zoom', 'teams'.")
    channel_type_display: Optional[str] = None
    address_url: Optional[str] = Field(None, description="Virtual meeting URL.")
    additional_info: Optional[str] = Field(None, description="Comma-separated additional info URLs.")
    max_participants: Optional[int] = None
    session_key: Optional[str] = None


class EncounterReasonUseInput(_CodeableConceptInput):
    """reason[].use[] (0..*) CodeableConcept — purpose of this reason entry."""


class EncounterReasonValueInput(BaseModel):
    """
    reason[].value[] (0..*) CodeableReference(Condition | DiagnosticReport |
    Observation | Procedure) — what triggered the encounter.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference: Optional[str] = Field(
        None,
        description="FHIR reference, e.g. 'Condition/120001' or 'Observation/99001'.",
    )
    reference_display: Optional[str] = None


class EncounterReasonInput(BaseModel):
    """reason[] (0..*) BackboneElement — R5 consolidates R4 reasonCode + reasonReference."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[List[EncounterReasonUseInput]] = None
    value: Optional[List[EncounterReasonValueInput]] = None


class EncounterDiagnosisConditionInput(BaseModel):
    """diagnosis[].condition[] (0..*) CodeableReference(Condition)."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference: Optional[str] = Field(None, description="FHIR reference, e.g. 'Condition/120001'.")
    reference_display: Optional[str] = None


class EncounterDiagnosisUseInput(_CodeableConceptInput):
    """diagnosis[].use[] (0..*) CodeableConcept — role of this diagnosis (primary, CC, etc.)."""


class EncounterDiagnosisInput(BaseModel):
    """diagnosis[] (0..*) BackboneElement — clinical diagnoses relevant to this encounter."""

    model_config = ConfigDict(extra="forbid")

    condition: Optional[List[EncounterDiagnosisConditionInput]] = None
    use: Optional[List[EncounterDiagnosisUseInput]] = None


class EncounterAccountInput(BaseModel):
    """account[] (0..*) Reference(Account) — billing accounts for this encounter."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference, e.g. 'Account/501'.")
    reference_display: Optional[str] = None


class EncounterAdmissionInput(BaseModel):
    """
    admission (0..1 BackboneElement) — R5 renamed from R4 hospitalization.

    Captures pre-admission details, origin/destination location, admit source,
    re-admission flag, and discharge disposition.
    """

    model_config = ConfigDict(extra="forbid")

    pre_admission_identifier_system: Optional[str] = None
    pre_admission_identifier_value: Optional[str] = None
    origin: Optional[str] = Field(None, description="Reference to origin Location or Organization, e.g. 'Location/123'.")
    origin_display: Optional[str] = None
    admit_source_system: Optional[str] = None
    admit_source_code: Optional[str] = None
    admit_source_display: Optional[str] = None
    admit_source_text: Optional[str] = None
    re_admission_system: Optional[str] = None
    re_admission_code: Optional[str] = None
    re_admission_display: Optional[str] = None
    re_admission_text: Optional[str] = None
    destination: Optional[str] = Field(None, description="Reference to destination Location or Organization, e.g. 'Location/456'.")
    destination_display: Optional[str] = None
    discharge_disposition_system: Optional[str] = None
    discharge_disposition_code: Optional[str] = None
    discharge_disposition_display: Optional[str] = None
    discharge_disposition_text: Optional[str] = None


class EncounterLocationInput(BaseModel):
    """
    location[] (0..*) BackboneElement — where the encounter took place.

    `status`: planned | active | reserved | completed
    `form`: physical form of the location (e.g. room, ward, building).
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference to the Location, e.g. 'Location/501'.")
    reference_display: Optional[str] = None
    status: Optional[str] = Field(None, description="planned | active | reserved | completed")
    form_system: Optional[str] = None
    form_code: Optional[str] = None
    form_display: Optional[str] = None
    form_text: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


# ── Main schemas ──────────────────────────────────────────────────────────────


class EncounterCreateSchema(BaseModel):
    """
    Input schema for creating an Encounter resource (POST /encounters).

    `status` (1..1) is required. All other fields are optional.
    All child arrays are embedded in this single body — the fhir-server has
    no separate sub-resource routes for Encounter.

    Notes:
      - `class_` uses alias="class" (Python reserved word); send {"class": [...]} in JSON.
      - `created_by` is NOT here — FhirClient injects it from actor.sub.
      - `user_id` / `org_id` are Optional to match the fhir-server schema.
      - References use public integer IDs: 'Patient/10001', 'Practitioner/30001'.
    """

    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "status": "in-progress",
                "priority_code": "17621005",
                "priority_system": "http://snomed.info/sct",
                "priority_display": "Normal",
                "subject": "Patient/10001",
                "actual_period_start": "2026-04-01T09:00:00Z",
                "class": [
                    {
                        "coding_system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                        "coding_code": "AMB",
                        "coding_display": "ambulatory",
                    }
                ],
                "participant": [
                    {
                        "type": [{"coding_code": "PART", "text": "Participant"}],
                        "reference": "Practitioner/30001",
                        "period_start": "2026-04-01T09:00:00Z",
                    }
                ],
            }
        },
    )

    # Tenant scoping
    user_id: Optional[str] = None
    org_id: Optional[str] = None

    # status (1..1) — required
    status: str = Field(
        ...,
        description="R5 status: planned | in-progress | on-hold | discharged | completed | cancelled | discontinued | entered-in-error | unknown",
    )

    # priority (0..1 CodeableConcept)
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None

    # subject (0..1 Reference(Patient | Group))
    subject: Optional[str] = Field(None, description="Patient or Group reference, e.g. 'Patient/10001'.")

    # subjectStatus (0..1 CodeableConcept) — R5 new
    subject_status_system: Optional[str] = None
    subject_status_code: Optional[str] = None
    subject_status_display: Optional[str] = None
    subject_status_text: Optional[str] = None

    # actualPeriod (0..1 Period) — R5 renamed from period
    actual_period_start: Optional[datetime] = None
    actual_period_end: Optional[datetime] = None

    # plannedStartDate / plannedEndDate (0..1 dateTime) — R5 new
    planned_start_date: Optional[datetime] = None
    planned_end_date: Optional[datetime] = None

    # length (0..1 Duration)
    length_value: Optional[float] = None
    length_comparator: Optional[str] = Field(None, description="< | <= | >= | >")
    length_unit: Optional[str] = None
    length_system: Optional[str] = None
    length_code: Optional[str] = None

    # serviceProvider (0..1 Reference(Organization))
    service_provider: Optional[str] = Field(None, description="FHIR reference, e.g. 'Organization/100'.")
    service_provider_display: Optional[str] = None

    # partOf (0..1 Reference(Encounter)) — integer ID of parent encounter
    part_of_id: Optional[int] = None

    # Child arrays — all optional, all embedded in a single POST body
    identifier: Optional[List[EncounterIdentifierInput]] = None
    status_history: Optional[List[EncounterStatusHistoryInput]] = None
    class_history: Optional[List[EncounterClassHistoryInput]] = None
    # `class` is a Python reserved word — callers send {"class": [...]} in JSON
    class_: Optional[List[EncounterClassInput]] = Field(None, alias="class")
    business_status: Optional[List[EncounterBusinessStatusInput]] = None
    service_type: Optional[List[EncounterServiceTypeInput]] = None
    type: Optional[List[EncounterTypeInput]] = None
    episode_of_care: Optional[List[EncounterEpisodeOfCareInput]] = None
    based_on: Optional[List[EncounterBasedOnInput]] = None
    care_team: Optional[List[EncounterCareTeamInput]] = None
    participant: Optional[List[EncounterParticipantInput]] = None
    appointment: Optional[List[EncounterAppointmentRefInput]] = None
    virtual_service: Optional[List[EncounterVirtualServiceInput]] = None
    reason: Optional[List[EncounterReasonInput]] = None
    diagnosis: Optional[List[EncounterDiagnosisInput]] = None
    account: Optional[List[EncounterAccountInput]] = None
    admission: Optional[EncounterAdmissionInput] = None
    diet_preference: Optional[List[_CodeableConceptInput]] = None
    special_arrangement: Optional[List[_CodeableConceptInput]] = None
    special_courtesy: Optional[List[_CodeableConceptInput]] = None
    location: Optional[List[EncounterLocationInput]] = None


class EncounterPatchSchema(BaseModel):
    """
    Input schema for partially updating an Encounter (PATCH /encounters/{id}).

    Only scalar fields are patchable. Structural arrays (participant, diagnosis,
    location, etc.) and the subject reference cannot be changed after creation —
    delete and re-create the Encounter to correct those.

    At least one field must be provided (enforced in the service layer).
    `updated_by` is NOT included — FhirClient injects it from actor.sub.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = Field(
        None,
        description="R5 status: planned | in-progress | on-hold | discharged | completed | cancelled | discontinued | entered-in-error | unknown",
    )
    # Close the encounter by setting the actual period end timestamp
    actual_period_end: Optional[datetime] = Field(None, description="Close the encounter by setting the actual period end time.")
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None
    subject_status_system: Optional[str] = None
    subject_status_code: Optional[str] = None
    subject_status_display: Optional[str] = None
    subject_status_text: Optional[str] = None
    planned_end_date: Optional[datetime] = None


class ListEncountersSchema(BaseModel):
    """
    Query parameters for listing Encounters (GET /encounters).

    All filters are optional — omitting them returns all encounters the caller can see.
    Admin callers may use `user_id` / `org_id` to scope across tenants.
    """

    status: Optional[str] = Field(
        None,
        description="Filter by encounter status (planned | in-progress | completed | cancelled | etc.).",
    )
    patient_id: Optional[int] = Field(
        None,
        description="Filter encounters for this patient (integer patient_id).",
    )
    appointment_id: Optional[int] = Field(
        None,
        description="Filter encounters linked to this appointment via Encounter.appointment[].",
    )
    # Date range filters on actualPeriod.start
    actual_period_start_from: Optional[datetime] = Field(
        None,
        description="Return encounters whose actualPeriod.start >= this value (ISO 8601).",
    )
    actual_period_start_to: Optional[datetime] = Field(
        None,
        description="Return encounters whose actualPeriod.start <= this value (ISO 8601).",
    )
    user_id: Optional[str] = Field(None, description="Filter by user_id for tenant scoping.")
    org_id: Optional[str] = Field(None, description="Filter by org_id for tenant scoping.")
    limit: int = Field(default=50, ge=1, le=200, description="Maximum number of records per page.")
    offset: int = Field(default=0, ge=0, description="Number of records to skip.")
