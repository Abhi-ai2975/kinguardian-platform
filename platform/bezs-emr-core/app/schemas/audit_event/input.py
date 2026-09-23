from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AuditEventSubtypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class AuditEventPurposeOfEventInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class AuditEventSourceTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class AuditEventAgentRoleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class AuditEventAgentPolicyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: Optional[str] = None


class AuditEventAgentPurposeOfUseInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class AuditEventAgentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    who: Optional[str] = Field(None, description="FHIR reference, e.g. 'Practitioner/30001'.")
    who_display: Optional[str] = None

    alt_id: Optional[str] = None
    name: Optional[str] = None
    requestor: bool = False

    location: Optional[str] = Field(None, description="FHIR reference, e.g. 'Location/230001'.")
    location_display: Optional[str] = None

    media_system: Optional[str] = None
    media_code: Optional[str] = None
    media_display: Optional[str] = None

    network_address: Optional[str] = None
    network_type: Optional[str] = None

    roles: list[AuditEventAgentRoleInput] = Field(default_factory=list)
    policies: list[AuditEventAgentPolicyInput] = Field(default_factory=list)
    purpose_of_uses: list[AuditEventAgentPurposeOfUseInput] = Field(default_factory=list)


class AuditEventEntitySecurityLabelInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class AuditEventEntityDetailInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str
    value_string: Optional[str] = None
    value_base64_binary: Optional[str] = None


class AuditEventEntityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    what: Optional[str] = Field(None, description="FHIR reference, e.g. 'Patient/10001'.")
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

    security_labels: list[AuditEventEntitySecurityLabelInput] = Field(default_factory=list)
    details: list[AuditEventEntityDetailInput] = Field(default_factory=list)


class AuditEventCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # type (1..1 Coding)
    type_system: Optional[str] = None
    type_code: str
    type_display: Optional[str] = None

    # action (0..1 code)
    action: Optional[str] = None

    # period (0..1)
    period_start: Optional[str] = None
    period_end: Optional[str] = None

    # recorded (1..1 instant)
    recorded: str

    # outcome (0..1)
    outcome: Optional[str] = None
    outcome_desc: Optional[str] = None

    # purposeOfEvent (0..*)
    purpose_of_events: list[AuditEventPurposeOfEventInput] = Field(default_factory=list)

    # subtypes (0..*)
    subtypes: list[AuditEventSubtypeInput] = Field(default_factory=list)

    # source (1..1 BackboneElement)
    source_site: Optional[str] = None
    source_observer: Optional[str] = Field(None, description="FHIR reference, e.g. 'Practitioner/30001'.")
    source_observer_display: Optional[str] = None
    source_types: list[AuditEventSourceTypeInput] = Field(default_factory=list)

    # agent (1..*)
    agents: list[AuditEventAgentInput] = Field(default_factory=list)

    # entity (0..*)
    entities: list[AuditEventEntityInput] = Field(default_factory=list)

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "u-test",
                "org_id": "org-test",
                "type_code": "rest",
                "type_system": "http://dicom.nema.org/resources/ontology/DCM",
                "type_display": "RESTful Operation",
                "action": "R",
                "recorded": "2024-01-15T10:00:00Z",
                "outcome": "0",
                "source_observer": "Practitioner/30001",
                "source_observer_display": "Dr. Smith",
                "agents": [
                    {
                        "requestor": True,
                        "who": "Practitioner/30001",
                        "who_display": "Dr. Smith",
                        "name": "Dr. Smith",
                    }
                ],
            }
        },
    )


class AuditEventPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    action: Optional[str] = None
    outcome: Optional[str] = None
    outcome_desc: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None

    purpose_of_events: Optional[list[AuditEventPurposeOfEventInput]] = None
    subtypes: Optional[list[AuditEventSubtypeInput]] = None
    source_site: Optional[str] = None
    source_observer: Optional[str] = None
    source_observer_display: Optional[str] = None
    source_types: Optional[list[AuditEventSourceTypeInput]] = None
    agents: Optional[list[AuditEventAgentInput]] = None
    entities: Optional[list[AuditEventEntityInput]] = None
    updated_by: Optional[str] = None
