from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRBundleEntry,
    FHIRCodeableConcept,
    FHIRIdentifier,
    FHIRPeriod,
    FHIRReference,
)


# ── FHIR (camelCase) schemas ───────────────────────────────────────────────────


class FHIRScheduleSchema(BaseModel):
    resourceType: str = Field("Schedule", description="Always 'Schedule'.")
    id: str = Field(..., description="Public schedule_id as a string.")
    active: Optional[bool] = None
    identifier: Optional[List[FHIRIdentifier]] = None
    serviceCategory: Optional[List[FHIRCodeableConcept]] = None
    serviceType: Optional[List[FHIRCodeableConcept]] = None
    specialty: Optional[List[FHIRCodeableConcept]] = None
    actor: Optional[List[FHIRReference]] = None
    planningHorizon: Optional[FHIRPeriod] = None
    comment: Optional[str] = None


class FHIRScheduleBundleEntry(BaseModel):
    resource: FHIRScheduleSchema


class FHIRScheduleBundle(FHIRBundle):
    entry: Optional[List[FHIRScheduleBundleEntry]] = None


# ── Plain (snake_case) schemas ────────────────────────────────────────────────


class PlainScheduleIdentifier(BaseModel):
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


class PlainScheduleServiceCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainScheduleServiceType(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainScheduleSpecialty(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainScheduleActor(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainScheduleResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    active: Optional[bool] = None
    comment: Optional[str] = None
    planning_horizon_start: Optional[str] = None
    planning_horizon_end: Optional[str] = None
    identifier: Optional[List[PlainScheduleIdentifier]] = None
    service_category: Optional[List[PlainScheduleServiceCategory]] = None
    service_type: Optional[List[PlainScheduleServiceType]] = None
    specialty: Optional[List[PlainScheduleSpecialty]] = None
    actor: Optional[List[PlainScheduleActor]] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedScheduleResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainScheduleResponse]
