from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, ConfigDict


# ---------------------------------------------------------------------------
# Plain sub-schemas
# ---------------------------------------------------------------------------


class PlainAuditEventSubtype(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class PlainAuditEventPurposeOfEvent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAuditEventSourceType(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class PlainAuditEventAgentRole(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAuditEventAgentPolicy(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    value: Optional[str] = None


class PlainAuditEventAgentPurposeOfUse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainAuditEventAgent(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    who_type: Optional[str] = None
    who_id: Optional[int] = None
    who_display: Optional[str] = None
    alt_id: Optional[str] = None
    name: Optional[str] = None
    requestor: bool
    location_type: Optional[str] = None
    location_id: Optional[int] = None
    location_display: Optional[str] = None
    media_system: Optional[str] = None
    media_code: Optional[str] = None
    media_display: Optional[str] = None
    network_address: Optional[str] = None
    network_type: Optional[str] = None
    roles: list[PlainAuditEventAgentRole] = []
    policies: list[PlainAuditEventAgentPolicy] = []
    purpose_of_uses: list[PlainAuditEventAgentPurposeOfUse] = []


class PlainAuditEventEntitySecurityLabel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class PlainAuditEventEntityDetail(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    type: str
    value_string: Optional[str] = None
    value_base64_binary: Optional[str] = None


class PlainAuditEventEntity(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    what_type: Optional[str] = None
    what_id: Optional[int] = None
    what_display: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    role_system: Optional[str] = None
    role_code: Optional[str] = None
    role_display: Optional[str] = None
    lifecycle_system: Optional[str] = None
    lifecycle_code: Optional[str] = None
    lifecycle_display: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    query: Optional[str] = None
    security_labels: list[PlainAuditEventEntitySecurityLabel] = []
    details: list[PlainAuditEventEntityDetail] = []


# ---------------------------------------------------------------------------
# Plain main response
# ---------------------------------------------------------------------------


class PlainAuditEventResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    action: Optional[str] = None
    period_start: Optional[Any] = None
    period_end: Optional[Any] = None
    recorded: Any
    outcome: Optional[str] = None
    outcome_desc: Optional[str] = None
    source_site: Optional[str] = None
    source_observer_type: Optional[str] = None
    source_observer_id: Optional[int] = None
    source_observer_display: Optional[str] = None
    subtypes: list[PlainAuditEventSubtype] = []
    purpose_of_events: list[PlainAuditEventPurposeOfEvent] = []
    source_types: list[PlainAuditEventSourceType] = []
    agents: list[PlainAuditEventAgent] = []
    entities: list[PlainAuditEventEntity] = []


class PaginatedAuditEventResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    total: int
    limit: int
    offset: int
    data: list[PlainAuditEventResponse]


# ---------------------------------------------------------------------------
# FHIR response schemas
# ---------------------------------------------------------------------------


class FHIRAuditEventSchema(BaseModel):
    model_config = ConfigDict(extra="allow")
    resourceType: str = "AuditEvent"
    id: str


class FHIRAuditEventBundleEntry(BaseModel):
    model_config = ConfigDict(extra="allow")
    resource: FHIRAuditEventSchema


class FHIRAuditEventBundle(BaseModel):
    model_config = ConfigDict(extra="allow")
    resourceType: str = "Bundle"
    type: str = "searchset"
    total: int
    entry: list[FHIRAuditEventBundleEntry] = []
