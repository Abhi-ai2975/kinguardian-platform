from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class FHIRCoding(BaseModel):
    system: Optional[str] = None
    version: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None
    userSelected: Optional[bool] = None


class FHIRCodeableConcept(BaseModel):
    coding: Optional[List[FHIRCoding]] = None
    text: Optional[str] = None


class FHIRReference(BaseModel):
    reference: Optional[str] = None
    display: Optional[str] = None


class FHIRPeriod(BaseModel):
    start: Optional[str] = None
    end: Optional[str] = None


class FHIRHumanName(BaseModel):
    use: Optional[str] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period: Optional[FHIRPeriod] = None


class FHIRIdentifier(BaseModel):
    use: Optional[str] = None
    type: Optional[FHIRCodeableConcept] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period: Optional[FHIRPeriod] = None
    assigner: Optional[Dict[str, str]] = None


class FHIRContactPoint(BaseModel):
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period: Optional[FHIRPeriod] = None


class FHIRAddress(BaseModel):
    use: Optional[str] = None
    type: Optional[str] = None
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None
    period: Optional[FHIRPeriod] = None


class FHIRBundleEntry(BaseModel):
    resource: Any


class FHIRBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "searchset"
    total: int
    entry: Optional[List[FHIRBundleEntry]] = None


# ── Shared plain (snake_case) sub-types ──────────────────────────────────────


class PlainCoding(BaseModel):
    system: Optional[str] = None
    version: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None
    user_selected: Optional[bool] = None


class PlainIdentifierType(BaseModel):
    text: Optional[str] = None
    coding: Optional[List[PlainCoding]] = None


class PlainIdentifier(BaseModel):
    use: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    period_end: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    assigner: Optional[str] = None
    type: Optional[PlainIdentifierType] = None


class PlainReasonCode(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None
