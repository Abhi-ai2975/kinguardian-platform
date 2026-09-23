from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import (
    FHIRBundle,
    FHIRCodeableConcept,
    FHIRIdentifier,
    FHIRReference,
)


# ── FHIR (camelCase) schemas ───────────────────────────────────────────────────


class FHIRSlotSchema(BaseModel):
    resourceType: str = Field("Slot", description="Always 'Slot'.")
    id: str = Field(..., description="Public slot_id as a string.")
    identifier: Optional[List[FHIRIdentifier]] = None
    serviceCategory: Optional[List[FHIRCodeableConcept]] = None
    serviceType: Optional[List[FHIRCodeableConcept]] = None
    specialty: Optional[List[FHIRCodeableConcept]] = None
    appointmentType: Optional[FHIRCodeableConcept] = None
    schedule: Optional[FHIRReference] = None
    status: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    overbooked: Optional[bool] = None
    comment: Optional[str] = None


class FHIRSlotBundleEntry(BaseModel):
    resource: FHIRSlotSchema


class FHIRSlotBundle(FHIRBundle):
    entry: Optional[List[FHIRSlotBundleEntry]] = None


# ── Plain (snake_case) schemas ─────────────────────────────────────────────────


class PlainSlotIdentifier(BaseModel):
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


class PlainSlotServiceCategory(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainSlotServiceType(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainSlotSpecialty(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainSlotResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    status: Optional[str] = None
    start: Optional[str] = None
    end: Optional[str] = None
    overbooked: Optional[bool] = None
    comment: Optional[str] = None
    schedule_type: Optional[str] = None
    schedule_id: Optional[int] = None
    schedule_display: Optional[str] = None
    appointment_type_system: Optional[str] = None
    appointment_type_code: Optional[str] = None
    appointment_type_display: Optional[str] = None
    appointment_type_text: Optional[str] = None
    identifier: Optional[List[PlainSlotIdentifier]] = None
    service_category: Optional[List[PlainSlotServiceCategory]] = None
    service_type: Optional[List[PlainSlotServiceType]] = None
    specialty: Optional[List[PlainSlotSpecialty]] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


class PaginatedSlotResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainSlotResponse]
