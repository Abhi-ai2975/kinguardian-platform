from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRReference,
)


# ---------------------------------------------------------------------------
# FHIR (camelCase) sub-schemas
# ---------------------------------------------------------------------------


class FHIRAllergyIntoleranceReactionManifestation(BaseModel):
    coding: Optional[List[Dict[str, Any]]] = None
    text: Optional[str] = None


class FHIRAllergyIntoleranceReaction(BaseModel):
    substance: Optional[FHIRCodeableConcept] = None
    manifestation: List[FHIRAllergyIntoleranceReactionManifestation]
    description: Optional[str] = None
    onset: Optional[str] = None
    severity: Optional[str] = None
    exposureRoute: Optional[FHIRCodeableConcept] = None
    note: Optional[List[Dict[str, Any]]] = None


class FHIRAllergyIntoleranceSchema(BaseModel):
    resourceType: str = Field("AllergyIntolerance", description="Always 'AllergyIntolerance'.")
    id: str = Field(..., description="Public allergy_intolerance_id as string.")
    identifier: Optional[List[Dict[str, Any]]] = None
    clinicalStatus: Optional[FHIRCodeableConcept] = None
    verificationStatus: Optional[FHIRCodeableConcept] = None
    type: Optional[str] = None
    category: Optional[List[str]] = None
    criticality: Optional[str] = None
    code: Optional[FHIRCodeableConcept] = None
    patient: FHIRReference
    encounter: Optional[FHIRReference] = None
    onsetDateTime: Optional[str] = None
    onsetAge: Optional[Dict[str, Any]] = None
    onsetPeriod: Optional[Dict[str, Any]] = None
    onsetRange: Optional[Dict[str, Any]] = None
    onsetString: Optional[str] = None
    recordedDate: Optional[str] = None
    recorder: Optional[FHIRReference] = None
    asserter: Optional[FHIRReference] = None
    lastOccurrence: Optional[str] = None
    note: Optional[List[Dict[str, Any]]] = None
    reaction: Optional[List[FHIRAllergyIntoleranceReaction]] = None

    model_config = ConfigDict(populate_by_name=True)


class FHIRAllergyIntoleranceBundleEntry(BaseModel):
    resource: FHIRAllergyIntoleranceSchema


class FHIRAllergyIntoleranceBundle(FHIRBundle):
    entry: Optional[List[FHIRAllergyIntoleranceBundleEntry]] = None


# ---------------------------------------------------------------------------
# Plain (snake_case) sub-schemas
# ---------------------------------------------------------------------------


class PlainAllergyIntoleranceIdentifier(BaseModel):
    model_config = ConfigDict(extra="allow")
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


class PlainAllergyIntoleranceCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    category: str


class PlainAllergyIntoleranceNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainAllergyIntoleranceReactionManifestation(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAllergyIntoleranceReactionNote(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainAllergyIntoleranceReaction(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    substance_system: Optional[str] = None
    substance_code: Optional[str] = None
    substance_display: Optional[str] = None
    substance_text: Optional[str] = None
    description: Optional[str] = None
    onset: Optional[str] = None
    severity: Optional[str] = None
    exposure_route_system: Optional[str] = None
    exposure_route_code: Optional[str] = None
    exposure_route_display: Optional[str] = None
    exposure_route_text: Optional[str] = None
    manifestations: Optional[List[PlainAllergyIntoleranceReactionManifestation]] = None
    reaction_notes: Optional[List[PlainAllergyIntoleranceReactionNote]] = None


class PlainAllergyIntoleranceResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    clinical_status_system: Optional[str] = None
    clinical_status_code: Optional[str] = None
    clinical_status_display: Optional[str] = None
    clinical_status_text: Optional[str] = None
    verification_status_system: Optional[str] = None
    verification_status_code: Optional[str] = None
    verification_status_display: Optional[str] = None
    verification_status_text: Optional[str] = None
    type: Optional[str] = None
    criticality: Optional[str] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    patient_type: Optional[str] = None
    patient_id: Optional[int] = None
    patient_display: Optional[str] = None
    encounter_type: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    onset_date_time: Optional[str] = None
    onset_age_value: Optional[Decimal] = None
    onset_age_comparator: Optional[str] = None
    onset_age_unit: Optional[str] = None
    onset_age_system: Optional[str] = None
    onset_age_code: Optional[str] = None
    onset_period_start: Optional[str] = None
    onset_period_end: Optional[str] = None
    onset_range_low_value: Optional[Decimal] = None
    onset_range_low_unit: Optional[str] = None
    onset_range_low_system: Optional[str] = None
    onset_range_low_code: Optional[str] = None
    onset_range_high_value: Optional[Decimal] = None
    onset_range_high_unit: Optional[str] = None
    onset_range_high_system: Optional[str] = None
    onset_range_high_code: Optional[str] = None
    onset_string: Optional[str] = None
    recorded_date: Optional[str] = None
    recorder_type: Optional[str] = None
    recorder_id: Optional[int] = None
    recorder_display: Optional[str] = None
    asserter_type: Optional[str] = None
    asserter_id: Optional[int] = None
    asserter_display: Optional[str] = None
    last_occurrence: Optional[str] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifiers: Optional[List[PlainAllergyIntoleranceIdentifier]] = None
    categories: Optional[List[PlainAllergyIntoleranceCategory]] = None
    notes: Optional[List[PlainAllergyIntoleranceNote]] = None
    reactions: Optional[List[PlainAllergyIntoleranceReaction]] = None


class PaginatedAllergyIntoleranceResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainAllergyIntoleranceResponse]
