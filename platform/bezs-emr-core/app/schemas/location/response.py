from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRAddress,
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRContactPoint,
    FHIRCoding,
    FHIRReference,
)


# ---------------------------------------------------------------------------
# FHIR (camelCase) sub-schemas
# ---------------------------------------------------------------------------


class FHIRLocationPosition(BaseModel):
    longitude: Decimal
    latitude: Decimal
    altitude: Optional[Decimal] = None


class FHIRLocationHoursOfOperation(BaseModel):
    daysOfWeek: Optional[List[str]] = None
    allDay: Optional[bool] = None
    openingTime: Optional[str] = None
    closingTime: Optional[str] = None


class FHIRLocationSchema(BaseModel):
    resourceType: str = Field("Location", description="Always 'Location'.")
    id: str = Field(..., description="Public location_id as a string.")
    identifier: Optional[List[Dict[str, Any]]] = None
    status: Optional[str] = None
    operationalStatus: Optional[FHIRCoding] = None
    name: Optional[str] = None
    alias: Optional[List[str]] = None
    description: Optional[str] = None
    mode: Optional[str] = None
    type: Optional[List[FHIRCodeableConcept]] = None
    telecom: Optional[List[FHIRContactPoint]] = None
    address: Optional[FHIRAddress] = None
    physicalType: Optional[FHIRCodeableConcept] = None
    managingOrganization: Optional[FHIRReference] = None
    partOf: Optional[FHIRReference] = None
    availabilityExceptions: Optional[str] = None
    position: Optional[FHIRLocationPosition] = None
    hoursOfOperation: Optional[List[FHIRLocationHoursOfOperation]] = None
    endpoint: Optional[List[FHIRReference]] = None


class FHIRLocationBundleEntry(BaseModel):
    resource: FHIRLocationSchema


class FHIRLocationBundle(FHIRBundle):
    entry: Optional[List[FHIRLocationBundleEntry]] = None


# ---------------------------------------------------------------------------
# Plain (snake_case) sub-schemas
# ---------------------------------------------------------------------------


class PlainLocationIdentifier(BaseModel):
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


class PlainLocationAlias(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    alias: str


class PlainLocationType(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainLocationTelecom(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None


class PlainLocationHoursOfOperation(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    days_of_week: Optional[List[str]] = None
    all_day: Optional[bool] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None


class PlainLocationEndpoint(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainLocationResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    status: Optional[str] = None
    operational_status_system: Optional[str] = None
    operational_status_code: Optional[str] = None
    operational_status_display: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None
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
    physical_type_system: Optional[str] = None
    physical_type_code: Optional[str] = None
    physical_type_display: Optional[str] = None
    physical_type_text: Optional[str] = None
    managing_organization_type: Optional[str] = None
    managing_organization_id: Optional[int] = None
    managing_organization_display: Optional[str] = None
    part_of_type: Optional[str] = None
    part_of_id: Optional[int] = None
    part_of_display: Optional[str] = None
    availability_exceptions: Optional[str] = None
    position_longitude: Optional[Decimal] = None
    position_latitude: Optional[Decimal] = None
    position_altitude: Optional[Decimal] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainLocationIdentifier]] = None
    alias: Optional[List[PlainLocationAlias]] = None
    type: Optional[List[PlainLocationType]] = None
    telecom: Optional[List[PlainLocationTelecom]] = None
    hours_of_operation: Optional[List[PlainLocationHoursOfOperation]] = None
    endpoint: Optional[List[PlainLocationEndpoint]] = None


class PaginatedLocationResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainLocationResponse]
