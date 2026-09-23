from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common.fhir import FHIRBundle, FHIRCodeableConcept, FHIRReference


# ---------------------------------------------------------------------------
# FHIR (camelCase) sub-schemas
# ---------------------------------------------------------------------------


class FHIRProvenanceAgentRole(BaseModel):
    coding: Optional[List[Dict[str, Any]]] = None
    text: Optional[str] = None


class FHIRProvenanceAgent(BaseModel):
    type: Optional[FHIRCodeableConcept] = None
    role: Optional[List[FHIRProvenanceAgentRole]] = None
    who: FHIRReference
    onBehalfOf: Optional[FHIRReference] = None


class FHIRProvenanceEntity(BaseModel):
    role: str
    what: FHIRReference
    agent: Optional[List[FHIRProvenanceAgent]] = None


class FHIRProvenanceSignatureType(BaseModel):
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class FHIRProvenanceSignature(BaseModel):
    type: List[FHIRProvenanceSignatureType]
    when: str
    who: Optional[FHIRReference] = None
    onBehalfOf: Optional[FHIRReference] = None
    targetFormat: Optional[str] = None
    sigFormat: Optional[str] = None
    data: Optional[str] = None


class FHIRProvenanceSchema(BaseModel):
    resourceType: str = Field("Provenance", description="Always 'Provenance'.")
    id: str = Field(..., description="Public provenance_id as string.")
    target: List[FHIRReference]
    occurredDateTime: Optional[str] = None
    occurredPeriod: Optional[Dict[str, Any]] = None
    recorded: str
    policy: Optional[List[str]] = None
    location: Optional[FHIRReference] = None
    reason: Optional[List[FHIRCodeableConcept]] = None
    activity: Optional[FHIRCodeableConcept] = None
    agent: List[FHIRProvenanceAgent]
    entity: Optional[List[FHIRProvenanceEntity]] = None
    signature: Optional[List[FHIRProvenanceSignature]] = None

    model_config = ConfigDict(populate_by_name=True)


class FHIRProvenanceBundleEntry(BaseModel):
    resource: FHIRProvenanceSchema


class FHIRProvenanceBundle(FHIRBundle):
    entry: Optional[List[FHIRProvenanceBundleEntry]] = None


# ---------------------------------------------------------------------------
# Plain (snake_case) sub-schemas
# ---------------------------------------------------------------------------


class PlainProvenanceTarget(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainProvenancePolicy(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    uri: str


class PlainProvenanceReason(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainProvenanceAgentRole(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainProvenanceAgent(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    who_type: Optional[str] = None
    who_id: Optional[int] = None
    who_display: Optional[str] = None
    on_behalf_of_type: Optional[str] = None
    on_behalf_of_id: Optional[int] = None
    on_behalf_of_display: Optional[str] = None
    roles: Optional[List[PlainProvenanceAgentRole]] = None


class PlainProvenanceEntityAgent(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    who_type: Optional[str] = None
    who_id: Optional[int] = None
    who_display: Optional[str] = None
    on_behalf_of_type: Optional[str] = None
    on_behalf_of_id: Optional[int] = None
    on_behalf_of_display: Optional[str] = None


class PlainProvenanceEntity(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    role: str
    what_type: Optional[str] = None
    what_id: Optional[int] = None
    what_display: Optional[str] = None
    entity_agents: Optional[List[PlainProvenanceEntityAgent]] = None


class PlainProvenanceSignatureType(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class PlainProvenanceSignature(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    when: Optional[str] = None
    who_type: Optional[str] = None
    who_id: Optional[int] = None
    who_display: Optional[str] = None
    on_behalf_of_type: Optional[str] = None
    on_behalf_of_id: Optional[int] = None
    on_behalf_of_display: Optional[str] = None
    target_format: Optional[str] = None
    sig_format: Optional[str] = None
    data: Optional[str] = None
    signature_types: Optional[List[PlainProvenanceSignatureType]] = None


class PlainProvenanceResponse(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: int
    recorded: Optional[str] = None
    occurred_period_start: Optional[str] = None
    occurred_period_end: Optional[str] = None
    occurred_date_time: Optional[str] = None
    location_type: Optional[str] = None
    location_id: Optional[int] = None
    location_display: Optional[str] = None
    activity_system: Optional[str] = None
    activity_code: Optional[str] = None
    activity_display: Optional[str] = None
    activity_text: Optional[str] = None
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    targets: Optional[List[PlainProvenanceTarget]] = None
    policies: Optional[List[PlainProvenancePolicy]] = None
    reasons: Optional[List[PlainProvenanceReason]] = None
    agents: Optional[List[PlainProvenanceAgent]] = None
    entities: Optional[List[PlainProvenanceEntity]] = None
    signatures: Optional[List[PlainProvenanceSignature]] = None


class PaginatedProvenanceResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainProvenanceResponse]
