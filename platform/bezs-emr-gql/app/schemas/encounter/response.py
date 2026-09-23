"""
Plain JSON response schemas for the Encounter resource.

These models document the fhir-server's plain (non-FHIR) JSON output shape for
Encounter resources. `extra="allow"` on every model lets new fhir-server fields
pass through without requiring a schema bump here.

For the FHIR R4/R5 camelCase shape (application/fhir+json), see fhir_schemas.py.

Reference: https://hl7.org/fhir/R5/encounter.html
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Plain sub-schemas ─────────────────────────────────────────────────────────


class PlainEncounterIdentifier(BaseModel):
    """Plain JSON representation of an Encounter identifier."""

    model_config = ConfigDict(extra="allow")

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


class PlainEncounterStatusHistory(BaseModel):
    """A past status entry in the Encounter lifecycle."""

    model_config = ConfigDict(extra="allow")

    status: str
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainEncounterClassHistory(BaseModel):
    """R4 classHistory entry — kept for backward compatibility."""

    model_config = ConfigDict(extra="allow")

    class_system: Optional[str] = None
    class_version: Optional[str] = None
    class_code: Optional[str] = None
    class_display: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainEncounterClass(BaseModel):
    """class[] (0..*) CodeableConcept — R5 changed from 0..1 Coding."""

    model_config = ConfigDict(extra="allow")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterBusinessStatus(BaseModel):
    """businessStatus[] — R5 workflow status tracking."""

    model_config = ConfigDict(extra="allow")

    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    effective_date: Optional[str] = None


class PlainEncounterServiceType(BaseModel):
    """serviceType[] CodeableReference(HealthcareService)."""

    model_config = ConfigDict(extra="allow")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterType(BaseModel):
    """type[] CodeableConcept — clinical encounter type."""

    model_config = ConfigDict(extra="allow")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterEpisodeOfCare(BaseModel):
    """episodeOfCare[] Reference(EpisodeOfCare)."""

    model_config = ConfigDict(extra="allow")

    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterBasedOn(BaseModel):
    """basedOn[] Reference(ServiceRequest | CarePlan)."""

    model_config = ConfigDict(extra="allow")

    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterCareTeam(BaseModel):
    """careTeam[] Reference(CareTeam) — R5 new."""

    model_config = ConfigDict(extra="allow")

    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterParticipantType(BaseModel):
    """Type code for a participant's role in the encounter."""

    model_config = ConfigDict(extra="allow")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterParticipant(BaseModel):
    """participant[] BackboneElement — who was involved in the encounter."""

    model_config = ConfigDict(extra="allow")

    type: Optional[List[PlainEncounterParticipantType]] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainEncounterAppointmentRef(BaseModel):
    """appointment[] Reference(Appointment)."""

    model_config = ConfigDict(extra="allow")

    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterVirtualService(BaseModel):
    """virtualService[] VirtualServiceDetail — R5 telehealth info."""

    model_config = ConfigDict(extra="allow")

    channel_type_system: Optional[str] = None
    channel_type_code: Optional[str] = None
    channel_type_display: Optional[str] = None
    address_url: Optional[str] = None
    additional_info: Optional[str] = None
    max_participants: Optional[int] = None
    session_key: Optional[str] = None


class PlainEncounterReasonUse(BaseModel):
    """reason[].use[] CodeableConcept."""

    model_config = ConfigDict(extra="allow")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterReasonValue(BaseModel):
    """reason[].value[] CodeableReference(Condition | DiagnosticReport | Observation | Procedure)."""

    model_config = ConfigDict(extra="allow")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterReason(BaseModel):
    """reason[] BackboneElement — R5 consolidates R4 reasonCode + reasonReference."""

    model_config = ConfigDict(extra="allow")

    use: Optional[List[PlainEncounterReasonUse]] = None
    value: Optional[List[PlainEncounterReasonValue]] = None


class PlainEncounterDiagnosisCondition(BaseModel):
    """diagnosis[].condition[] CodeableReference(Condition)."""

    model_config = ConfigDict(extra="allow")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterDiagnosisUse(BaseModel):
    """diagnosis[].use[] CodeableConcept — role of this diagnosis."""

    model_config = ConfigDict(extra="allow")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEncounterDiagnosis(BaseModel):
    """diagnosis[] BackboneElement — clinical diagnoses."""

    model_config = ConfigDict(extra="allow")

    condition: Optional[List[PlainEncounterDiagnosisCondition]] = None
    use: Optional[List[PlainEncounterDiagnosisUse]] = None


class PlainEncounterAccount(BaseModel):
    """account[] Reference(Account) — billing accounts."""

    model_config = ConfigDict(extra="allow")

    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEncounterAdmission(BaseModel):
    """admission BackboneElement — R5 renamed from R4 hospitalization."""

    model_config = ConfigDict(extra="allow")

    pre_admission_identifier_system: Optional[str] = None
    pre_admission_identifier_value: Optional[str] = None
    origin_type: Optional[str] = None
    origin_id: Optional[int] = None
    origin_display: Optional[str] = None
    admit_source_system: Optional[str] = None
    admit_source_code: Optional[str] = None
    admit_source_display: Optional[str] = None
    admit_source_text: Optional[str] = None
    re_admission_system: Optional[str] = None
    re_admission_code: Optional[str] = None
    re_admission_display: Optional[str] = None
    re_admission_text: Optional[str] = None
    destination_type: Optional[str] = None
    destination_id: Optional[int] = None
    destination_display: Optional[str] = None
    discharge_disposition_system: Optional[str] = None
    discharge_disposition_code: Optional[str] = None
    discharge_disposition_display: Optional[str] = None
    discharge_disposition_text: Optional[str] = None


class PlainEncounterLocation(BaseModel):
    """location[] BackboneElement — where the encounter took place."""

    model_config = ConfigDict(extra="allow")

    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None
    status: Optional[str] = None
    form_system: Optional[str] = None
    form_code: Optional[str] = None
    form_display: Optional[str] = None
    form_text: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainEncounterLength(BaseModel):
    """length Duration — how long the encounter lasted."""

    model_config = ConfigDict(extra="allow")

    value: Optional[float] = None
    comparator: Optional[str] = None
    unit: Optional[str] = None
    system: Optional[str] = None
    code: Optional[str] = None


class PlainEncounterCodeableConcept(BaseModel):
    """Generic flat CodeableConcept — used for dietPreference, specialArrangement, specialCourtesy."""

    model_config = ConfigDict(extra="allow")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


# ── Top-level response ────────────────────────────────────────────────────────


class EncounterResponse(BaseModel):
    """
    Full plain JSON response for a single Encounter resource.

    Mirrors the fhir-server's PlainEncounterResponse. All child arrays use typed
    sub-schemas so Swagger renders their fields correctly.

    `extra="allow"` ensures new fhir-server fields propagate to callers without
    requiring a middleware schema bump.

    The `class_` field uses alias="class" + populate_by_name=True to match the
    fhir-server's JSON key while avoiding the Python reserved word.
    """

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    id: int = Field(..., description="Public encounter_id.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: Optional[str] = None

    # Priority (0..1 CodeableConcept — flat columns)
    priority_system: Optional[str] = None
    priority_code: Optional[str] = None
    priority_display: Optional[str] = None
    priority_text: Optional[str] = None

    # Subject reference (split by fhir-server into type + id + display)
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None

    # subjectStatus (0..1 CodeableConcept — flat columns)
    subject_status_system: Optional[str] = None
    subject_status_code: Optional[str] = None
    subject_status_display: Optional[str] = None
    subject_status_text: Optional[str] = None

    # actualPeriod / planned dates
    actual_period_start: Optional[str] = None
    actual_period_end: Optional[str] = None
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None

    # length Duration
    length: Optional[PlainEncounterLength] = None

    # serviceProvider reference
    service_provider_type: Optional[str] = None
    service_provider_id: Optional[int] = None
    service_provider_display: Optional[str] = None

    # partOf — integer ID of parent encounter
    part_of_id: Optional[int] = None

    # Admission (0..1 BackboneElement)
    admission: Optional[PlainEncounterAdmission] = None

    # Child arrays
    identifier: Optional[List[PlainEncounterIdentifier]] = None
    status_history: Optional[List[PlainEncounterStatusHistory]] = None
    class_history: Optional[List[PlainEncounterClassHistory]] = None
    # `class` is a JSON key — aliased here to avoid the Python reserved word
    class_: Optional[List[PlainEncounterClass]] = Field(None, alias="class")
    business_status: Optional[List[PlainEncounterBusinessStatus]] = None
    service_type: Optional[List[PlainEncounterServiceType]] = None
    type: Optional[List[PlainEncounterType]] = None
    episode_of_care: Optional[List[PlainEncounterEpisodeOfCare]] = None
    based_on: Optional[List[PlainEncounterBasedOn]] = None
    care_team: Optional[List[PlainEncounterCareTeam]] = None
    participant: Optional[List[PlainEncounterParticipant]] = None
    appointment: Optional[List[PlainEncounterAppointmentRef]] = None
    virtual_service: Optional[List[PlainEncounterVirtualService]] = None
    reason: Optional[List[PlainEncounterReason]] = None
    diagnosis: Optional[List[PlainEncounterDiagnosis]] = None
    account: Optional[List[PlainEncounterAccount]] = None
    diet_preference: Optional[List[PlainEncounterCodeableConcept]] = None
    special_arrangement: Optional[List[PlainEncounterCodeableConcept]] = None
    special_courtesy: Optional[List[PlainEncounterCodeableConcept]] = None
    location: Optional[List[PlainEncounterLocation]] = None

    # Audit fields
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedEncounterResponse(BaseModel):
    """
    Paginated list response for GET /encounters (application/json).

    `total` reflects the count across ALL pages, not just this page.
    """

    total: int = Field(..., description="Total number of matching encounters across all pages.")
    limit: int = Field(..., description="Page size requested.")
    offset: int = Field(..., description="Number of records skipped.")
    data: List[EncounterResponse] = Field(..., description="Array of plain-JSON Encounter objects.")
