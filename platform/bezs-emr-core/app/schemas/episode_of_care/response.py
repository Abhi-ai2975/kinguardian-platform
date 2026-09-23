from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Plain sub-schemas
# ---------------------------------------------------------------------------


class PlainEpisodeOfCareIdentifier(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[Any] = None
    period_end: Optional[Any] = None
    assigner: Optional[str] = None


class PlainEpisodeOfCareStatusHistory(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    status: str
    period_start: Optional[Any] = None
    period_end: Optional[Any] = None


class PlainEpisodeOfCareType(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainEpisodeOfCareDiagnosis(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None
    role_system: Optional[str] = None
    role_code: Optional[str] = None
    role_display: Optional[str] = None
    role_text: Optional[str] = None
    rank: Optional[int] = None


class PlainEpisodeOfCareReferralRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEpisodeOfCareTeam(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainEpisodeOfCareAccount(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


# ---------------------------------------------------------------------------
# Plain main response
# ---------------------------------------------------------------------------


class PlainEpisodeOfCareResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: str
    patient_type: Optional[str] = None
    patient_id: Optional[int] = None
    patient_display: Optional[str] = None
    managing_organization_type: Optional[str] = None
    managing_organization_id: Optional[int] = None
    managing_organization_display: Optional[str] = None
    period_start: Optional[Any] = None
    period_end: Optional[Any] = None
    care_manager_type: Optional[str] = None
    care_manager_id: Optional[int] = None
    care_manager_display: Optional[str] = None
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifiers: list[PlainEpisodeOfCareIdentifier] = []
    status_history: list[PlainEpisodeOfCareStatusHistory] = []
    types: list[PlainEpisodeOfCareType] = []
    diagnoses: list[PlainEpisodeOfCareDiagnosis] = []
    referral_requests: list[PlainEpisodeOfCareReferralRequest] = []
    team: list[PlainEpisodeOfCareTeam] = []
    accounts: list[PlainEpisodeOfCareAccount] = []


class PaginatedEpisodeOfCareResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    total: int
    limit: int
    offset: int
    data: list[PlainEpisodeOfCareResponse]


# ---------------------------------------------------------------------------
# FHIR response schemas
# ---------------------------------------------------------------------------


class FHIREpisodeOfCareSchema(BaseModel):
    model_config = ConfigDict(extra="allow")
    resourceType: str = "EpisodeOfCare"
    id: str


class FHIREpisodeOfCareBundleEntry(BaseModel):
    model_config = ConfigDict(extra="allow")
    resource: FHIREpisodeOfCareSchema


class FHIREpisodeOfCareBundle(BaseModel):
    model_config = ConfigDict(extra="allow")
    resourceType: str = "Bundle"
    type: str = "searchset"
    total: int
    entry: list[FHIREpisodeOfCareBundleEntry] = []
