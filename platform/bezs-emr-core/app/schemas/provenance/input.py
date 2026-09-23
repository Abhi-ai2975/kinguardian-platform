from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ProvenanceTargetInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Patient/10001' or 'Observation/160001'.")
    reference_display: Optional[str] = None


class ProvenancePolicyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    uri: str


class ProvenanceReasonInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ProvenanceAgentRoleInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ProvenanceAgentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # type (0..1 CodeableConcept)
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    # who (1..1 Reference — closed)
    who: str = Field(
        ...,
        description=(
            "Reference to the agent. One of: Practitioner/<id>, PractitionerRole/<id>, "
            "RelatedPerson/<id>, Patient/<id>, Device/<id>, Organization/<id>."
        ),
    )
    who_display: Optional[str] = None

    # onBehalfOf (0..1 Reference — same closed set)
    on_behalf_of: Optional[str] = Field(
        None,
        description="Reference to the entity being represented, same types as who.",
    )
    on_behalf_of_display: Optional[str] = None

    roles: Optional[List[ProvenanceAgentRoleInput]] = None


class ProvenanceEntityAgentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    who: str = Field(
        ...,
        description="Reference to the entity agent, same types as agent.who.",
    )
    who_display: Optional[str] = None

    on_behalf_of: Optional[str] = None
    on_behalf_of_display: Optional[str] = None


class ProvenanceEntityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: str = Field(..., description="derivation | revision | quotation | source | removal")
    what: str = Field(..., description="Reference to the source entity, e.g. 'DocumentReference/1'.")
    what_display: Optional[str] = None

    entity_agents: Optional[List[ProvenanceEntityAgentInput]] = None


class ProvenanceSignatureTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class ProvenanceSignatureInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    when: datetime = Field(..., description="When the signature was created.")

    who: Optional[str] = Field(
        None,
        description="Reference to the signer, e.g. 'Practitioner/30001'.",
    )
    who_display: Optional[str] = None

    on_behalf_of: Optional[str] = None
    on_behalf_of_display: Optional[str] = None

    target_format: Optional[str] = Field(None, description="MIME type of the signed content.")
    sig_format: Optional[str] = Field(None, description="MIME type of the signature.")
    data: Optional[str] = Field(None, description="Base64-encoded signature bytes.")

    signature_types: List[ProvenanceSignatureTypeInput] = Field(
        ..., min_length=1, description="Reason for the signature (1..* required)."
    )


class ProvenanceCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "user_id": "u-test",
                    "org_id": "org-test",
                    "recorded": "2024-01-15T10:30:00Z",
                    "targets": [{"reference": "Patient/10001"}],
                    "agents": [
                        {
                            "type_system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                            "type_code": "AUT",
                            "type_display": "Author",
                            "who": "Practitioner/30001",
                            "who_display": "Dr. Smith",
                        }
                    ],
                    "activity_system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
                    "activity_code": "CREATE",
                    "activity_display": "create",
                    "occurred_date_time": "2024-01-15T10:00:00Z",
                    "policies": [{"uri": "http://hospital.example.org/policies/privacy"}],
                    "reasons": [
                        {
                            "coding_system": "http://snomed.info/sct",
                            "coding_code": "308646001",
                            "coding_display": "Death certification",
                        }
                    ],
                }
            ]
        },
    )

    user_id: str
    org_id: str
    created_by: Optional[str] = None

    # recorded (1..1 instant)
    recorded: datetime = Field(..., description="When the activity was documented.")

    # target (1..*)
    targets: List[ProvenanceTargetInput] = Field(
        ..., min_length=1, description="Resources generated or updated by the activity (1..* required)."
    )

    # agents (1..*)
    agents: List[ProvenanceAgentInput] = Field(
        ..., min_length=1, description="Actors involved in the activity (1..* required)."
    )

    # occurred[x] (0..1 choice type)
    occurred_period_start: Optional[datetime] = None
    occurred_period_end: Optional[datetime] = None
    occurred_date_time: Optional[datetime] = None

    # location (0..1 Reference(Location))
    location: Optional[str] = Field(None, description="FHIR reference, e.g. 'Location/230001'.")
    location_display: Optional[str] = None

    # activity (0..1 CodeableConcept)
    activity_system: Optional[str] = None
    activity_code: Optional[str] = None
    activity_display: Optional[str] = None
    activity_text: Optional[str] = None

    # policy (0..*)
    policies: Optional[List[ProvenancePolicyInput]] = None

    # reason (0..*)
    reasons: Optional[List[ProvenanceReasonInput]] = None

    # entity (0..*)
    entities: Optional[List[ProvenanceEntityInput]] = None

    # signature (0..*)
    signatures: Optional[List[ProvenanceSignatureInput]] = None


class ProvenancePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recorded: Optional[datetime] = None

    occurred_period_start: Optional[datetime] = None
    occurred_period_end: Optional[datetime] = None
    occurred_date_time: Optional[datetime] = None

    location: Optional[str] = None
    location_display: Optional[str] = None

    activity_system: Optional[str] = None
    activity_code: Optional[str] = None
    activity_display: Optional[str] = None
    activity_text: Optional[str] = None

    targets: Optional[List[ProvenanceTargetInput]] = None
    policies: Optional[List[ProvenancePolicyInput]] = None
    reasons: Optional[List[ProvenanceReasonInput]] = None
    agents: Optional[List[ProvenanceAgentInput]] = None
    entities: Optional[List[ProvenanceEntityInput]] = None
    signatures: Optional[List[ProvenanceSignatureInput]] = None
    updated_by: Optional[str] = None
