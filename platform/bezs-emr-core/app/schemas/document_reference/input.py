from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.document_reference.enums import DocumentReferenceStatus


class DocumentReferenceIdentifierInput(BaseModel):
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


class DocumentReferenceCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DocumentReferenceAuthorInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: Optional[str] = Field(None, description="Author reference, e.g. 'Practitioner/30001'.")
    display: Optional[str] = None


class DocumentReferenceRelatesToInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code: str = Field(..., description="Relationship code: replaces, transforms, signs, or appends.")
    target: str = Field(..., description="Target DocumentReference, e.g. 'DocumentReference/320001'.")
    target_display: Optional[str] = None


class DocumentReferenceSecurityLabelInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DocumentReferenceAttachmentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[datetime] = None


class DocumentReferenceContentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    attachment: DocumentReferenceAttachmentInput = Field(..., description="Document attachment.")
    format_system: Optional[str] = None
    format_version: Optional[str] = None
    format_code: Optional[str] = None
    format_display: Optional[str] = None


class DocumentReferenceContextEncounterInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: Optional[str] = Field(None, description="Encounter/EpisodeOfCare reference, e.g. 'Encounter/20001'.")
    display: Optional[str] = None


class DocumentReferenceContextEventInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DocumentReferenceContextRelatedInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: Optional[str] = Field(None, description="Any resource reference, e.g. 'Observation/160001'.")
    display: Optional[str] = None


class DocumentReferenceContextInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    encounter: Optional[List[DocumentReferenceContextEncounterInput]] = None
    event: Optional[List[DocumentReferenceContextEventInput]] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    facility_type_system: Optional[str] = None
    facility_type_code: Optional[str] = None
    facility_type_display: Optional[str] = None
    facility_type_text: Optional[str] = None
    practice_setting_system: Optional[str] = None
    practice_setting_code: Optional[str] = None
    practice_setting_display: Optional[str] = None
    practice_setting_text: Optional[str] = None
    source_patient_info: Optional[str] = Field(None, description="Patient reference, e.g. 'Patient/10001'.")
    source_patient_info_display: Optional[str] = None
    related: Optional[List[DocumentReferenceContextRelatedInput]] = None


class DocumentReferenceCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # masterIdentifier (0..1)
    master_identifier_use: Optional[str] = None
    master_identifier_type_system: Optional[str] = None
    master_identifier_type_code: Optional[str] = None
    master_identifier_type_display: Optional[str] = None
    master_identifier_type_text: Optional[str] = None
    master_identifier_system: Optional[str] = None
    master_identifier_value: Optional[str] = None
    master_identifier_period_start: Optional[datetime] = None
    master_identifier_period_end: Optional[datetime] = None
    master_identifier_assigner: Optional[str] = None

    status: DocumentReferenceStatus = Field(..., description="current | superseded | entered-in-error")
    doc_status: Optional[str] = Field(None, description="preliminary | final | amended | entered-in-error")

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    subject: Optional[str] = Field(None, description="Reference to subject, e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    date: Optional[datetime] = None

    authors: Optional[List[DocumentReferenceAuthorInput]] = None
    authenticator: Optional[str] = Field(None, description="Authenticator reference, e.g. 'Practitioner/30001'.")
    authenticator_display: Optional[str] = None
    custodian: Optional[str] = Field(None, description="Custodian Organization reference, e.g. 'Organization/190001'.")
    custodian_display: Optional[str] = None

    relates_to: Optional[List[DocumentReferenceRelatesToInput]] = None
    description: Optional[str] = None
    security_labels: Optional[List[DocumentReferenceSecurityLabelInput]] = None
    content: List[DocumentReferenceContentInput] = Field(..., description="Document content (1..*).")
    identifiers: Optional[List[DocumentReferenceIdentifierInput]] = None
    categories: Optional[List[DocumentReferenceCategoryInput]] = None
    context: Optional[DocumentReferenceContextInput] = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "u-test",
                "org_id": "org-test",
                "status": "current",
                "type_code": "34108-1",
                "type_system": "http://loinc.org",
                "type_display": "Outpatient Note",
                "subject": "Patient/10001",
                "content": [
                    {
                        "attachment": {
                            "url": "https://example.org/documents/doc1.pdf",
                            "content_type": "application/pdf",
                            "title": "Outpatient visit note",
                        }
                    }
                ],
            }
        },
    )


class DocumentReferencePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[DocumentReferenceStatus] = None
    doc_status: Optional[str] = None

    master_identifier_use: Optional[str] = None
    master_identifier_type_system: Optional[str] = None
    master_identifier_type_code: Optional[str] = None
    master_identifier_type_display: Optional[str] = None
    master_identifier_type_text: Optional[str] = None
    master_identifier_system: Optional[str] = None
    master_identifier_value: Optional[str] = None
    master_identifier_period_start: Optional[datetime] = None
    master_identifier_period_end: Optional[datetime] = None
    master_identifier_assigner: Optional[str] = None

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    subject: Optional[str] = None
    subject_display: Optional[str] = None
    date: Optional[datetime] = None

    authors: Optional[List[DocumentReferenceAuthorInput]] = None
    authenticator: Optional[str] = None
    authenticator_display: Optional[str] = None
    custodian: Optional[str] = None
    custodian_display: Optional[str] = None

    relates_to: Optional[List[DocumentReferenceRelatesToInput]] = None
    description: Optional[str] = None
    security_labels: Optional[List[DocumentReferenceSecurityLabelInput]] = None
    content: Optional[List[DocumentReferenceContentInput]] = None
    identifiers: Optional[List[DocumentReferenceIdentifierInput]] = None
    categories: Optional[List[DocumentReferenceCategoryInput]] = None
    context: Optional[DocumentReferenceContextInput] = None
    updated_by: Optional[str] = None
