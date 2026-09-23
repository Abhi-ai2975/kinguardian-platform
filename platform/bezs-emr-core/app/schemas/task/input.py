from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class TaskIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class TaskBasedOnInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'ServiceRequest/80001'.")
    reference_display: Optional[str] = None


class TaskPartOfInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to a parent Task, e.g. 'Task/280001'.")
    reference_display: Optional[str] = None


class TaskPerformerTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class TaskInsuranceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to Coverage or ClaimResponse, e.g. 'Coverage/240001'.")
    reference_display: Optional[str] = None


class TaskNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(..., description="Annotation text content.")
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(None, description="Reference to author, e.g. 'Practitioner/30001'.")
    author_reference_display: Optional[str] = None


class TaskRelevantHistoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to Provenance, e.g. 'Provenance/270001'.")
    reference_display: Optional[str] = None


class TaskRestrictionRecipientInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description=(
            "Reference to recipient. Allowed: Patient/<id>, Practitioner/<id>, "
            "PractitionerRole/<id>, RelatedPerson/<id>, Group/<id>, Organization/<id>."
        ),
    )
    reference_display: Optional[str] = None


class TaskInputItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    value_boolean: Optional[bool] = None
    value_code: Optional[str] = None
    value_date: Optional[date] = None
    value_date_time: Optional[datetime] = None
    value_decimal: Optional[float] = None
    value_integer: Optional[int] = None
    value_string: Optional[str] = None
    value_uri: Optional[str] = None
    value_reference: Optional[str] = Field(None, description="Open reference, e.g. 'Observation/160001'.")
    value_reference_display: Optional[str] = None


class TaskOutputItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    value_boolean: Optional[bool] = None
    value_code: Optional[str] = None
    value_date: Optional[date] = None
    value_date_time: Optional[datetime] = None
    value_decimal: Optional[float] = None
    value_integer: Optional[int] = None
    value_string: Optional[str] = None
    value_uri: Optional[str] = None
    value_reference: Optional[str] = Field(None, description="Open reference, e.g. 'Observation/160001'.")
    value_reference_display: Optional[str] = None


class TaskCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "user_id": "u-test",
                    "org_id": "org-test",
                    "status": "requested",
                    "intent": "order",
                    "priority": "routine",
                    "code_system": "http://snomed.info/sct",
                    "code_code": "3457005",
                    "code_display": "Patient referral",
                    "description": "Refer patient to specialist",
                    "focus": "ServiceRequest/80001",
                    "for": "Patient/10001",
                    "authored_on": "2024-01-15T10:30:00Z",
                    "requester": "Practitioner/30001",
                    "owner": "Practitioner/30002",
                }
            ]
        },
    )

    user_id: str
    org_id: str
    created_by: Optional[str] = None

    # required
    status: str = Field(..., description="Task status code: draft | requested | received | accepted | rejected | ready | cancelled | in-progress | on-hold | failed | completed | entered-in-error")
    intent: str = Field(..., description="Task intent: unknown | proposal | plan | order | original-order | reflex-order | filler-order | instance-order | option")

    # optional scalar
    priority: Optional[str] = Field(None, description="routine | urgent | asap | stat")
    description: Optional[str] = None
    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    authored_on: Optional[datetime] = None
    last_modified: Optional[datetime] = None

    # groupIdentifier (0..1 Identifier — flat)
    group_identifier_use: Optional[str] = None
    group_identifier_system: Optional[str] = None
    group_identifier_value: Optional[str] = None
    group_identifier_type_system: Optional[str] = None
    group_identifier_type_code: Optional[str] = None
    group_identifier_type_display: Optional[str] = None
    group_identifier_type_text: Optional[str] = None

    # statusReason (0..1 CodeableConcept)
    status_reason_system: Optional[str] = None
    status_reason_code: Optional[str] = None
    status_reason_display: Optional[str] = None
    status_reason_text: Optional[str] = None

    # businessStatus (0..1 CodeableConcept)
    business_status_system: Optional[str] = None
    business_status_code: Optional[str] = None
    business_status_display: Optional[str] = None
    business_status_text: Optional[str] = None

    # code (0..1 CodeableConcept)
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    # focus (0..1 Reference(Any) open)
    focus: Optional[str] = Field(None, description="Open reference to resource being actioned, e.g. 'ServiceRequest/80001'.")
    focus_display: Optional[str] = None

    # for (0..1 Reference(Any) open)
    for_reference: Optional[str] = Field(
        None,
        alias="for",
        description="Open reference to entity benefiting from task, e.g. 'Patient/10001'.",
    )
    for_display: Optional[str] = None

    # encounter (0..1 Reference(Encounter))
    encounter: Optional[str] = Field(None, description="FHIR reference, e.g. 'Encounter/20001'.")
    encounter_display: Optional[str] = None

    # executionPeriod (0..1 Period)
    execution_period_start: Optional[datetime] = None
    execution_period_end: Optional[datetime] = None

    # requester (0..1 Reference — closed)
    requester: Optional[str] = Field(
        None,
        description="Reference to requester. Allowed: Device/<id>, Organization/<id>, Patient/<id>, Practitioner/<id>, PractitionerRole/<id>, RelatedPerson/<id>.",
    )
    requester_display: Optional[str] = None

    # owner (0..1 Reference — closed)
    owner: Optional[str] = Field(
        None,
        description="Reference to owner. Allowed: Practitioner/<id>, PractitionerRole/<id>, Organization/<id>, CareTeam/<id>, HealthcareService/<id>, Patient/<id>, Device/<id>, RelatedPerson/<id>.",
    )
    owner_display: Optional[str] = None

    # location (0..1 Reference(Location))
    location: Optional[str] = Field(None, description="FHIR reference, e.g. 'Location/230001'.")
    location_display: Optional[str] = None

    # reasonCode (0..1 CodeableConcept)
    reason_code_system: Optional[str] = None
    reason_code_code: Optional[str] = None
    reason_code_display: Optional[str] = None
    reason_code_text: Optional[str] = None

    # reasonReference (0..1 Reference(Any) open)
    reason_reference: Optional[str] = Field(None, description="Open reference to reason resource.")
    reason_reference_display: Optional[str] = None

    # restriction (0..1 BackboneElement — scalar parts flat)
    restriction_repetitions: Optional[int] = None
    restriction_period_start: Optional[datetime] = None
    restriction_period_end: Optional[datetime] = None

    # child arrays
    identifiers: Optional[List[TaskIdentifierInput]] = None
    based_on: Optional[List[TaskBasedOnInput]] = None
    part_of: Optional[List[TaskPartOfInput]] = None
    performer_types: Optional[List[TaskPerformerTypeInput]] = None
    insurance: Optional[List[TaskInsuranceInput]] = None
    notes: Optional[List[TaskNoteInput]] = None
    relevant_history: Optional[List[TaskRelevantHistoryInput]] = None
    restriction_recipients: Optional[List[TaskRestrictionRecipientInput]] = None
    inputs: Optional[List[TaskInputItemInput]] = None
    outputs: Optional[List[TaskOutputItemInput]] = None

    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class TaskPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    status: Optional[str] = None
    intent: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None
    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    authored_on: Optional[datetime] = None
    last_modified: Optional[datetime] = None

    group_identifier_use: Optional[str] = None
    group_identifier_system: Optional[str] = None
    group_identifier_value: Optional[str] = None
    group_identifier_type_system: Optional[str] = None
    group_identifier_type_code: Optional[str] = None
    group_identifier_type_display: Optional[str] = None
    group_identifier_type_text: Optional[str] = None

    status_reason_system: Optional[str] = None
    status_reason_code: Optional[str] = None
    status_reason_display: Optional[str] = None
    status_reason_text: Optional[str] = None

    business_status_system: Optional[str] = None
    business_status_code: Optional[str] = None
    business_status_display: Optional[str] = None
    business_status_text: Optional[str] = None

    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    focus: Optional[str] = None
    focus_display: Optional[str] = None

    for_reference: Optional[str] = Field(None, alias="for")
    for_display: Optional[str] = None

    encounter: Optional[str] = None
    encounter_display: Optional[str] = None

    execution_period_start: Optional[datetime] = None
    execution_period_end: Optional[datetime] = None

    requester: Optional[str] = None
    requester_display: Optional[str] = None

    owner: Optional[str] = None
    owner_display: Optional[str] = None

    location: Optional[str] = None
    location_display: Optional[str] = None

    reason_code_system: Optional[str] = None
    reason_code_code: Optional[str] = None
    reason_code_display: Optional[str] = None
    reason_code_text: Optional[str] = None

    reason_reference: Optional[str] = None
    reason_reference_display: Optional[str] = None

    restriction_repetitions: Optional[int] = None
    restriction_period_start: Optional[datetime] = None
    restriction_period_end: Optional[datetime] = None

    identifiers: Optional[List[TaskIdentifierInput]] = None
    based_on: Optional[List[TaskBasedOnInput]] = None
    part_of: Optional[List[TaskPartOfInput]] = None
    performer_types: Optional[List[TaskPerformerTypeInput]] = None
    insurance: Optional[List[TaskInsuranceInput]] = None
    notes: Optional[List[TaskNoteInput]] = None
    relevant_history: Optional[List[TaskRelevantHistoryInput]] = None
    restriction_recipients: Optional[List[TaskRestrictionRecipientInput]] = None
    inputs: Optional[List[TaskInputItemInput]] = None
    outputs: Optional[List[TaskOutputItemInput]] = None
    updated_by: Optional[str] = None
