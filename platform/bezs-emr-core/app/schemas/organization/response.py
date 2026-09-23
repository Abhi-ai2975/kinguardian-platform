from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRAddress,
    FHIRBundle,
    FHIRBundleEntry,
    FHIRCodeableConcept,
    FHIRContactPoint,
    FHIRHumanName,
    FHIRIdentifier,
    FHIRReference,
)


# ── FHIR (camelCase) sub-schemas ──────────────────────────────────────────────


class FHIROrganizationContact(BaseModel):
    purpose: Optional[FHIRCodeableConcept] = None
    name: Optional[FHIRHumanName] = None
    telecom: Optional[List[FHIRContactPoint]] = None
    address: Optional[FHIRAddress] = None


class FHIROrganizationSchema(BaseModel):
    resourceType: str = Field("Organization", description="Always 'Organization'.")
    id: str = Field(..., description="Public organization_id as a string.")
    active: Optional[bool] = Field(None, description="Whether this organization is active.")
    identifier: Optional[List[FHIRIdentifier]] = None
    type: Optional[List[FHIRCodeableConcept]] = None
    name: Optional[str] = None
    alias: Optional[List[str]] = None
    telecom: Optional[List[FHIRContactPoint]] = None
    address: Optional[List[FHIRAddress]] = None
    partOf: Optional[FHIRReference] = None
    contact: Optional[List[FHIROrganizationContact]] = None
    endpoint: Optional[List[FHIRReference]] = None


class FHIROrganizationBundleEntry(BaseModel):
    resource: FHIROrganizationSchema


class FHIROrganizationBundle(FHIRBundle):
    entry: Optional[List[FHIROrganizationBundleEntry]] = None


# ── Plain (snake_case) sub-schemas ────────────────────────────────────────────


class PlainOrganizationIdentifier(BaseModel):
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


class PlainOrganizationType(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainOrganizationAlias(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    value: Optional[str] = None


class PlainOrganizationTelecom(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainOrganizationAddress(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
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


class PlainOrganizationContactTelecom(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainOrganizationContact(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    purpose_system: Optional[str] = None
    purpose_code: Optional[str] = None
    purpose_display: Optional[str] = None
    purpose_text: Optional[str] = None
    name_use: Optional[str] = None
    name_text: Optional[str] = None
    name_family: Optional[str] = None
    name_given: Optional[List[str]] = None
    name_prefix: Optional[List[str]] = None
    name_suffix: Optional[List[str]] = None
    name_period_start: Optional[str] = None
    name_period_end: Optional[str] = None
    address_use: Optional[str] = None
    address_type: Optional[str] = None
    address_text: Optional[str] = None
    address_line: Optional[List[str]] = None
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    address_period_start: Optional[str] = None
    address_period_end: Optional[str] = None
    telecoms: Optional[List[PlainOrganizationContactTelecom]] = None


class PlainOrganizationEndpoint(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainOrganizationResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    active: Optional[bool] = None
    name: Optional[str] = None
    partof_type: Optional[str] = None
    partof_id: Optional[int] = None
    partof_display: Optional[str] = None
    identifier: Optional[List[PlainOrganizationIdentifier]] = None
    type: Optional[List[PlainOrganizationType]] = None
    alias: Optional[List[PlainOrganizationAlias]] = None
    telecom: Optional[List[PlainOrganizationTelecom]] = None
    address: Optional[List[PlainOrganizationAddress]] = None
    contact: Optional[List[PlainOrganizationContact]] = None
    endpoint: Optional[List[PlainOrganizationEndpoint]] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedOrganizationResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainOrganizationResponse]
