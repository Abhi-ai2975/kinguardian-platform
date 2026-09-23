from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── Plain sub-schemas ─────────────────────────────────────────────────────────


class PlainImmunizationIdentifier(BaseModel):
    id: int
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


class PlainImmunizationPerformer(BaseModel):
    id: int
    function_system: Optional[str] = None
    function_code: Optional[str] = None
    function_display: Optional[str] = None
    function_text: Optional[str] = None
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainImmunizationNote(BaseModel):
    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainImmunizationReasonCode(BaseModel):
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainImmunizationReasonReference(BaseModel):
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainImmunizationSubpotentReason(BaseModel):
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainImmunizationEducation(BaseModel):
    id: int
    document_type: Optional[str] = None
    reference: Optional[str] = None
    publication_date: Optional[str] = None
    presentation_date: Optional[str] = None


class PlainImmunizationProgramEligibility(BaseModel):
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainImmunizationReaction(BaseModel):
    id: int
    date: Optional[str] = None
    detail_type: Optional[str] = None
    detail_id: Optional[int] = None
    detail_display: Optional[str] = None
    reported: Optional[bool] = None


class PlainImmunizationTargetDisease(BaseModel):
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainImmunizationProtocolApplied(BaseModel):
    id: int
    series: Optional[str] = None
    authority_type: Optional[str] = None
    authority_id: Optional[int] = None
    authority_display: Optional[str] = None
    dose_number_positive_int: Optional[int] = None
    dose_number_string: Optional[str] = None
    series_doses_positive_int: Optional[int] = None
    series_doses_string: Optional[str] = None
    target_diseases: Optional[List[PlainImmunizationTargetDisease]] = None


# ── Main plain response ───────────────────────────────────────────────────────


class PlainImmunizationResponse(BaseModel):
    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None

    status: str
    occurrence_datetime: Optional[str] = None
    occurrence_string: Optional[str] = None

    status_reason_system: Optional[str] = None
    status_reason_code: Optional[str] = None
    status_reason_display: Optional[str] = None
    status_reason_text: Optional[str] = None

    vaccine_code_system: Optional[str] = None
    vaccine_code_code: Optional[str] = None
    vaccine_code_display: Optional[str] = None
    vaccine_code_text: Optional[str] = None

    patient_type: Optional[str] = None
    patient_id: Optional[int] = None
    patient_display: Optional[str] = None

    encounter_type: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None

    recorded: Optional[str] = None
    primary_source: Optional[bool] = None

    report_origin_system: Optional[str] = None
    report_origin_code: Optional[str] = None
    report_origin_display: Optional[str] = None
    report_origin_text: Optional[str] = None

    location_type: Optional[str] = None
    location_id: Optional[int] = None
    location_display: Optional[str] = None

    manufacturer_type: Optional[str] = None
    manufacturer_id: Optional[int] = None
    manufacturer_display: Optional[str] = None

    lot_number: Optional[str] = None
    expiration_date: Optional[str] = None

    site_system: Optional[str] = None
    site_code: Optional[str] = None
    site_display: Optional[str] = None
    site_text: Optional[str] = None

    route_system: Optional[str] = None
    route_code: Optional[str] = None
    route_display: Optional[str] = None
    route_text: Optional[str] = None

    dose_quantity_value: Optional[Decimal] = None
    dose_quantity_unit: Optional[str] = None
    dose_quantity_system: Optional[str] = None
    dose_quantity_code: Optional[str] = None

    is_subpotent: Optional[bool] = None

    funding_source_system: Optional[str] = None
    funding_source_code: Optional[str] = None
    funding_source_display: Optional[str] = None
    funding_source_text: Optional[str] = None

    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    identifiers: Optional[List[PlainImmunizationIdentifier]] = None
    performers: Optional[List[PlainImmunizationPerformer]] = None
    notes: Optional[List[PlainImmunizationNote]] = None
    reason_codes: Optional[List[PlainImmunizationReasonCode]] = None
    reason_references: Optional[List[PlainImmunizationReasonReference]] = None
    subpotent_reasons: Optional[List[PlainImmunizationSubpotentReason]] = None
    educations: Optional[List[PlainImmunizationEducation]] = None
    program_eligibilities: Optional[List[PlainImmunizationProgramEligibility]] = None
    reactions: Optional[List[PlainImmunizationReaction]] = None
    protocol_applied: Optional[List[PlainImmunizationProtocolApplied]] = None


class PaginatedImmunizationResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainImmunizationResponse]


# ── FHIR schemas ──────────────────────────────────────────────────────────────


class FHIRImmunizationSchema(BaseModel):
    resourceType: str = "Immunization"
    id: str
    status: str
    occurrenceDateTime: Optional[str] = None
    occurrenceString: Optional[str] = None
    vaccineCode: Optional[Dict[str, Any]] = None
    patient: Optional[Dict[str, Any]] = None
    encounter: Optional[Dict[str, Any]] = None
    recorded: Optional[str] = None
    primarySource: Optional[bool] = None
    reportOrigin: Optional[Dict[str, Any]] = None
    location: Optional[Dict[str, Any]] = None
    manufacturer: Optional[Dict[str, Any]] = None
    lotNumber: Optional[str] = None
    expirationDate: Optional[str] = None
    site: Optional[Dict[str, Any]] = None
    route: Optional[Dict[str, Any]] = None
    doseQuantity: Optional[Dict[str, Any]] = None
    isSubpotent: Optional[bool] = None
    statusReason: Optional[Dict[str, Any]] = None
    fundingSource: Optional[Dict[str, Any]] = None
    identifier: Optional[List[Dict[str, Any]]] = None
    performer: Optional[List[Dict[str, Any]]] = None
    note: Optional[List[Dict[str, Any]]] = None
    reasonCode: Optional[List[Dict[str, Any]]] = None
    reasonReference: Optional[List[Dict[str, Any]]] = None
    subpotentReason: Optional[List[Dict[str, Any]]] = None
    education: Optional[List[Dict[str, Any]]] = None
    programEligibility: Optional[List[Dict[str, Any]]] = None
    reaction: Optional[List[Dict[str, Any]]] = None
    protocolApplied: Optional[List[Dict[str, Any]]] = None


class FHIRImmunizationBundleEntry(BaseModel):
    resource: FHIRImmunizationSchema


class FHIRImmunizationBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "searchset"
    total: int
    entry: List[FHIRImmunizationBundleEntry]
