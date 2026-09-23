from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common.fhir import FHIRBundle, FHIRReference, FHIRIdentifier


# ── FHIR answer sub-types ──────────────────────────────────────────────────────


class FHIRAnswerCoding(BaseModel):
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class FHIRAnswerQuantity(BaseModel):
    value: Optional[float] = None
    unit: Optional[str] = None
    system: Optional[str] = None
    code: Optional[str] = None


class FHIRAnswerValueReference(BaseModel):
    reference: Optional[str] = None
    display: Optional[str] = None


class FHIRAnswerAttachment(BaseModel):
    contentType: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


class FHIRAnswer(BaseModel):
    valueBoolean: Optional[bool] = None
    valueDecimal: Optional[float] = None
    valueInteger: Optional[int] = None
    valueDate: Optional[str] = None
    valueDateTime: Optional[str] = None
    valueTime: Optional[str] = None
    valueString: Optional[str] = None
    valueUri: Optional[str] = None
    valueCoding: Optional[FHIRAnswerCoding] = None
    valueQuantity: Optional[FHIRAnswerQuantity] = None
    valueReference: Optional[FHIRAnswerValueReference] = None
    valueAttachment: Optional[FHIRAnswerAttachment] = None
    item: Optional[List["FHIRQRItem"]] = None


class FHIRQRItem(BaseModel):
    linkId: str
    text: Optional[str] = None
    definition: Optional[str] = None
    answer: Optional[List[FHIRAnswer]] = None
    item: Optional[List["FHIRQRItem"]] = None


FHIRAnswer.model_rebuild()
FHIRQRItem.model_rebuild()


# ── FHIR QuestionnaireResponse schema ─────────────────────────────────────────


class FHIRQuestionnaireResponseSchema(BaseModel):
    resourceType: str = Field("QuestionnaireResponse", description="Always 'QuestionnaireResponse'.")
    id: str = Field(..., description="Public questionnaire_response_id as a string.")
    identifier: Optional[FHIRIdentifier] = None
    basedOn: Optional[List[FHIRReference]] = None
    partOf: Optional[List[FHIRReference]] = None
    questionnaire: str = Field(..., description="Canonical URL of the answered Questionnaire.")
    status: str = Field(..., description="in-progress | completed | amended | entered-in-error | stopped")
    subject: Optional[FHIRReference] = None
    encounter: Optional[FHIRReference] = None
    authored: Optional[str] = None
    author: Optional[FHIRReference] = None
    source: Optional[FHIRReference] = None
    item: Optional[List[FHIRQRItem]] = None


class FHIRQuestionnaireResponseBundleEntry(BaseModel):
    resource: FHIRQuestionnaireResponseSchema


class FHIRQuestionnaireResponseBundle(FHIRBundle):
    entry: Optional[List[FHIRQuestionnaireResponseBundleEntry]] = None


# ── Plain (snake_case) sub-types ──────────────────────────────────────────────


class PlainAnswerCoding(BaseModel):
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class PlainAnswerQuantity(BaseModel):
    value: Optional[float] = None
    unit: Optional[str] = None
    system: Optional[str] = None
    code: Optional[str] = None


class PlainAnswerAttachment(BaseModel):
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


class PlainQRAnswer(BaseModel):
    value_type: Optional[str] = Field(
        None,
        description="boolean | decimal | integer | date | dateTime | time | string | uri | coding | quantity | reference | attachment",
    )
    value_boolean: Optional[bool] = None
    value_decimal: Optional[float] = None
    value_integer: Optional[int] = None
    value_string: Optional[str] = Field(None, description="Used for string, date, time, and uri value types.")
    value_datetime: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    value_coding: Optional[PlainAnswerCoding] = None
    value_quantity: Optional[PlainAnswerQuantity] = None
    value_reference: Optional[str] = None
    value_reference_display: Optional[str] = None
    value_attachment: Optional[PlainAnswerAttachment] = None
    item: Optional[List["PlainQRItem"]] = None


class PlainQRItem(BaseModel):
    link_id: str
    text: Optional[str] = None
    definition: Optional[str] = None
    answer: Optional[List[PlainQRAnswer]] = None
    item: Optional[List["PlainQRItem"]] = None


PlainQRAnswer.model_rebuild()
PlainQRItem.model_rebuild()


class PlainQRBasedOn(BaseModel):
    reference_type: Optional[str] = Field(None, description="CarePlan | ServiceRequest")
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainQRPartOf(BaseModel):
    reference_type: Optional[str] = Field(None, description="Observation | Procedure")
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


# ── Plain QuestionnaireResponse response ──────────────────────────────────────


class PlainQuestionnaireResponse(BaseModel):
    id: int = Field(..., description="Public questionnaire_response_id.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    questionnaire: Optional[str] = Field(None, description="Canonical URL of the answered Questionnaire.")
    status: Optional[str] = Field(None, description="in-progress | completed | amended | entered-in-error | stopped")

    # identifier (0..1 in R4)
    identifier_use: Optional[str] = Field(None, description="usual | official | temp | secondary | old")
    identifier_type_system: Optional[str] = None
    identifier_type_code: Optional[str] = None
    identifier_type_display: Optional[str] = None
    identifier_type_text: Optional[str] = None
    identifier_system: Optional[str] = None
    identifier_value: Optional[str] = None
    identifier_period_start: Optional[str] = None
    identifier_period_end: Optional[str] = None
    identifier_assigner: Optional[str] = None

    # basedOn / partOf
    based_on: Optional[List[PlainQRBasedOn]] = None
    part_of: Optional[List[PlainQRPartOf]] = None

    subject_type: Optional[str] = Field(None, description="e.g. 'Patient'")
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_id: Optional[int] = Field(None, description="Public encounter_id of the linked Encounter.")
    authored: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    author_type: Optional[str] = Field(None, description="e.g. 'Practitioner' | 'Patient'")
    author_id: Optional[int] = None
    author_display: Optional[str] = None
    source_type: Optional[str] = Field(None, description="e.g. 'Patient' | 'Practitioner'")
    source_id: Optional[int] = None
    source_display: Optional[str] = None
    item: Optional[List[PlainQRItem]] = None

    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# ── Paginated response ────────────────────────────────────────────────────────


class PaginatedQuestionnaireResponseResponse(BaseModel):
    total: int = Field(..., description="Total number of matching questionnaire responses.")
    limit: int = Field(..., description="Page size requested.")
    offset: int = Field(..., description="Number of records skipped.")
    data: List[PlainQuestionnaireResponse] = Field(
        ..., description="Array of plain-JSON QuestionnaireResponse objects."
    )
