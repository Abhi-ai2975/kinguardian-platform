from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.questionnaire_response.enums import QuestionnaireResponseStatus
from app.models.enums import IdentifierUse


# ── Answer value sub-types ─────────────────────────────────────────────────────


class AnswerCodingInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class AnswerQuantityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: Optional[float] = None
    unit: Optional[str] = None
    system: Optional[str] = None
    code: Optional[str] = None


class AnswerAttachmentInput(BaseModel):
    """valueAttachment — Attachment datatype (R4)."""

    model_config = ConfigDict(extra="forbid")
    content_type: Optional[str] = Field(None, description="MIME type, e.g. 'application/pdf'. Required if data is present.")
    language: Optional[str] = Field(None, description="BCP-47 language code.")
    data: Optional[str] = Field(None, description="Base64-encoded content.")
    url: Optional[str] = Field(None, description="URI where the data can be found.")
    size: Optional[int] = Field(None, description="Number of bytes before base64 encoding.")
    hash: Optional[str] = Field(None, description="Base64-encoded SHA-1 hash.")
    title: Optional[str] = Field(None, description="Label to display in place of the data.")
    creation: Optional[datetime] = Field(None, description="Date attachment was first created.")


# ── basedOn / partOf reference inputs ─────────────────────────────────────────


class QRBasedOnInput(BaseModel):
    """basedOn — Reference(CarePlan | ServiceRequest)."""

    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'ServiceRequest/80001' or 'CarePlan/1'.")
    reference_display: Optional[str] = None


class QRPartOfInput(BaseModel):
    """partOf — Reference(Observation | Procedure)."""

    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Observation/1' or 'Procedure/100001'.")
    reference_display: Optional[str] = None


# ── Answer input ───────────────────────────────────────────────────────────────


class AnswerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value_boolean: Optional[bool] = None
    value_decimal: Optional[float] = None
    value_integer: Optional[int] = None
    value_date: Optional[str] = Field(None, description="Date answer (YYYY-MM-DD).", examples=["2024-06-01"])
    value_datetime: Optional[datetime] = None
    value_time: Optional[str] = Field(None, description="Time answer (HH:MM:SS).", examples=["09:00:00"])
    value_string: Optional[str] = None
    value_uri: Optional[str] = None
    value_coding: Optional[AnswerCodingInput] = None
    value_quantity: Optional[AnswerQuantityInput] = None
    value_reference: Optional[str] = Field(
        None,
        description="Reference answer, e.g. 'Patient/10001'.",
    )
    value_reference_display: Optional[str] = None
    value_attachment: Optional[AnswerAttachmentInput] = None
    item: Optional[List["ItemInput"]] = None


# ── Item input (recursive) ─────────────────────────────────────────────────────


class ItemInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    link_id: str = Field(..., description="Pointer to the specific item from the Questionnaire.", examples=["1.1"])
    definition: Optional[str] = None
    text: Optional[str] = Field(None, description="Question text or group name.", examples=["What is your date of birth?"])
    answer: Optional[List[AnswerInput]] = None
    item: Optional[List["ItemInput"]] = None


AnswerInput.model_rebuild()
ItemInput.model_rebuild()


# ── Create / patch ─────────────────────────────────────────────────────────────


class QuestionnaireResponseCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "questionnaire": "http://example.org/fhir/Questionnaire/phq-9",
                "status": "completed",
                "identifier_use": "official",
                "identifier_system": "http://example.org/identifiers",
                "identifier_value": "qr-2024-001",
                "subject": "Patient/10001",
                "encounter": "Encounter/20001",
                "authored": "2024-06-01T09:00:00Z",
                "author": "Practitioner/30001",
                "source": "Patient/10001",
                "based_on": [
                    {"reference": "ServiceRequest/80001"}
                ],
                "item": [
                    {
                        "link_id": "1",
                        "text": "Over the last 2 weeks, how often have you felt down?",
                        "answer": [
                            {
                                "value_coding": {
                                    "system": "http://loinc.org",
                                    "code": "LA6568-5",
                                    "display": "Not at all",
                                }
                            }
                        ],
                    }
                ],
            }
        },
    )

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None
    questionnaire: str = Field(
        ...,
        description="Canonical URL or id of the Questionnaire this response answers.",
        examples=["http://example.org/fhir/Questionnaire/phq-9"],
    )
    status: QuestionnaireResponseStatus

    # identifier (0..1 in R4)
    identifier_use: Optional[IdentifierUse] = Field(
        None, description="usual | official | temp | secondary | old"
    )
    identifier_type_system: Optional[str] = None
    identifier_type_code: Optional[str] = None
    identifier_type_display: Optional[str] = None
    identifier_type_text: Optional[str] = None
    identifier_system: Optional[str] = None
    identifier_value: Optional[str] = None
    identifier_period_start: Optional[datetime] = None
    identifier_period_end: Optional[datetime] = None
    identifier_assigner: Optional[str] = None

    # basedOn (0..*)
    based_on: Optional[List[QRBasedOnInput]] = Field(
        None,
        description="Plan or order fulfilled by this response.",
    )

    # partOf (0..*)
    part_of: Optional[List[QRPartOfInput]] = Field(
        None,
        description="Procedure or observation this questionnaire response is part of.",
    )

    subject: Optional[str] = Field(
        None,
        description="Subject reference, e.g. 'Patient/10001'.",
    )
    subject_display: Optional[str] = None
    encounter: Optional[str] = Field(
        None,
        description="Encounter reference, e.g. 'Encounter/20001'.",
    )
    authored: Optional[datetime] = Field(None, description="Date/time the answers were gathered.")
    author: Optional[str] = Field(
        None,
        description="Who recorded the answers, e.g. 'Practitioner/30001' or 'Patient/10001'.",
    )
    author_display: Optional[str] = None
    source: Optional[str] = Field(
        None,
        description="Who answered the questions (if different from author), e.g. 'Patient/10001'.",
    )
    source_display: Optional[str] = None
    item: Optional[List[ItemInput]] = None


class QuestionnaireResponsePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[QuestionnaireResponseStatus] = None
    authored: Optional[datetime] = None
    updated_by: Optional[str] = None
