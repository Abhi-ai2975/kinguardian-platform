from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.common.fhir import (
    FHIRAddress,
    FHIRBundle,
    FHIRBundleEntry,
    FHIRCodeableConcept,
    FHIRContactPoint,
    FHIRHumanName,
    FHIRIdentifier,
    FHIRPeriod,
    FHIRReference,
)


# ── FHIR (camelCase) sub-schemas ──────────────────────────────────────────────


class FHIRRelatedPersonAttachment(BaseModel):
    contentType: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


class FHIRRelatedPersonCommunication(BaseModel):
    language: Optional[FHIRCodeableConcept] = None
    preferred: Optional[bool] = None


class FHIRRelatedPersonSchema(BaseModel):
    resourceType: str = Field("RelatedPerson", description="Always 'RelatedPerson'.")
    id: str = Field(..., description="Public related_person_id as a string.")
    active: Optional[bool] = None
    patient: Optional[FHIRReference] = Field(None, description="Reference to Patient.")
    relationship: Optional[List[FHIRCodeableConcept]] = None
    name: Optional[List[FHIRHumanName]] = None
    telecom: Optional[List[FHIRContactPoint]] = None
    gender: Optional[str] = Field(None, description="male | female | other | unknown")
    birthDate: Optional[str] = None
    address: Optional[List[FHIRAddress]] = None
    photo: Optional[List[FHIRRelatedPersonAttachment]] = None
    period: Optional[FHIRPeriod] = None
    identifier: Optional[List[FHIRIdentifier]] = None
    communication: Optional[List[FHIRRelatedPersonCommunication]] = None


class FHIRRelatedPersonBundleEntry(BaseModel):
    resource: FHIRRelatedPersonSchema


class FHIRRelatedPersonBundle(FHIRBundle):
    entry: Optional[List[FHIRRelatedPersonBundleEntry]] = None


# ── Plain (snake_case) sub-schemas ────────────────────────────────────────────


class PlainRelatedPersonIdentifier(BaseModel):
    id: Optional[int] = None
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


class PlainRelatedPersonRelationship(BaseModel):
    id: Optional[int] = None
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainRelatedPersonName(BaseModel):
    id: Optional[int] = None
    use: Optional[str] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainRelatedPersonTelecom(BaseModel):
    id: Optional[int] = None
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainRelatedPersonAddress(BaseModel):
    id: Optional[int] = None
    use: Optional[str] = None
    type: Optional[str] = None
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainRelatedPersonPhoto(BaseModel):
    id: Optional[int] = None
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


class PlainRelatedPersonCommunication(BaseModel):
    id: Optional[int] = None
    language_system: Optional[str] = None
    language_code: Optional[str] = None
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = None


class PlainRelatedPersonResponse(BaseModel):
    id: int = Field(..., description="Public related_person_id.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    active: Optional[bool] = None
    patient_type: Optional[str] = None
    patient_id: Optional[int] = None
    patient_display: Optional[str] = None
    gender: Optional[str] = None
    birth_date: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    identifiers: Optional[List[PlainRelatedPersonIdentifier]] = None
    relationships: Optional[List[PlainRelatedPersonRelationship]] = None
    names: Optional[List[PlainRelatedPersonName]] = None
    telecoms: Optional[List[PlainRelatedPersonTelecom]] = None
    addresses: Optional[List[PlainRelatedPersonAddress]] = None
    photos: Optional[List[PlainRelatedPersonPhoto]] = None
    communications: Optional[List[PlainRelatedPersonCommunication]] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedRelatedPersonResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainRelatedPersonResponse]
