"""
Input schemas for DocumentReference resource endpoints.

Three schemas cover the write/query surfaces:
  - DocumentReferenceCreateSchema — POST /document-references body
  - DocumentReferencePatchSchema  — PATCH /document-references/{id} body
  - ListDocumentReferencesSchema  — GET /document-references query parameters

Design notes:
  - `status` and `content` are required on DocumentReferenceCreateSchema
    (FHIR R4: status is 1..1, content is 1..*).
  - `content[].attachment.url` should point to the FilNest file URL.
  - `context.related` links this document pointer to other clinical resources
    (e.g. ServiceRequest, DiagnosticReport) for traceability.
  - Unlike DiagnosticReport, child arrays (content, authors, security_labels, etc.)
    CAN be replaced via PATCH on the fhir-server.
  - List filters: only limit and offset (fhir-server does not expose richer filters yet).
"""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Sub-resource input schemas ────────────────────────────────────────────────


class DocumentReferenceIdentifierInput(BaseModel):
    """Business identifier for the DocumentReference."""

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
    """High-level categorisation of the document (e.g. clinical note, report)."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DocumentReferenceAuthorInput(BaseModel):
    """Author who created or is responsible for the document."""

    model_config = ConfigDict(extra="forbid")

    reference: Optional[str] = Field(None, description="Author reference e.g. 'Practitioner/30001'.")
    display: Optional[str] = None


class DocumentReferenceRelatesToInput(BaseModel):
    """Relationship to another DocumentReference (replaces, transforms, signs, appends)."""

    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., description="Relationship code: replaces | transforms | signs | appends.")
    target: str = Field(..., description="Target DocumentReference e.g. 'DocumentReference/320001'.")
    target_display: Optional[str] = None


class DocumentReferenceSecurityLabelInput(BaseModel):
    """Security and privacy metadata tag for the document."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DocumentReferenceAttachmentInput(BaseModel):
    """
    Attachment pointing to the actual document content.

    For FilNest uploads: provide `url` (the FilNest file URL) and `content_type`
    (MIME type e.g. 'application/pdf'). `title` is optional but recommended.
    """

    model_config = ConfigDict(extra="forbid")

    content_type: Optional[str] = Field(None, description="MIME type e.g. 'application/pdf'.")
    language: Optional[str] = Field(None, description="BCP-47 language code e.g. 'en'.")
    data: Optional[str] = Field(None, description="Base64-encoded content (use url instead where possible).")
    url: Optional[str] = Field(None, description="URL where the document is accessible e.g. FilNest URL.")
    size: Optional[int] = None
    hash: Optional[str] = Field(None, description="SHA-1 hash of the data (base64).")
    title: Optional[str] = None
    creation: Optional[datetime] = None


class DocumentReferenceContentInput(BaseModel):
    """
    Content entry for the DocumentReference (1..*).

    Each entry wraps an attachment plus optional format metadata.
    """

    model_config = ConfigDict(extra="forbid")

    attachment: DocumentReferenceAttachmentInput = Field(..., description="Document attachment.")
    format_system: Optional[str] = None
    format_version: Optional[str] = None
    format_code: Optional[str] = None
    format_display: Optional[str] = None


class DocumentReferenceContextEncounterInput(BaseModel):
    """Clinical encounter in which this document was created."""

    model_config = ConfigDict(extra="forbid")

    reference: Optional[str] = Field(
        None, description="Encounter or EpisodeOfCare reference e.g. 'Encounter/20001'."
    )
    display: Optional[str] = None


class DocumentReferenceContextEventInput(BaseModel):
    """Clinical event that this document describes."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class DocumentReferenceContextRelatedInput(BaseModel):
    """
    Related resource that this document is linked to.

    Use to link the DocumentReference to a DiagnosticReport, ServiceRequest,
    or any other clinical resource for traceability.
    """

    model_config = ConfigDict(extra="forbid")

    reference: Optional[str] = Field(
        None,
        description=(
            "Any FHIR resource reference e.g. 'ServiceRequest/80001' "
            "or 'DiagnosticReport/50001'."
        ),
    )
    display: Optional[str] = None


class DocumentReferenceContextInput(BaseModel):
    """Clinical context in which this document was created."""

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
    source_patient_info: Optional[str] = Field(None, description="Patient reference e.g. 'Patient/10001'.")
    source_patient_info_display: Optional[str] = None
    related: Optional[List[DocumentReferenceContextRelatedInput]] = None


# ── Create / Patch / List ─────────────────────────────────────────────────────


class DocumentReferenceCreateSchema(BaseModel):
    """
    Full create body for a DocumentReference resource.

    Both `status` and `content` are required (FHIR R4 1..1 and 1..*).
    All other fields are optional. Provide `context.related` to link this
    document pointer to a DiagnosticReport and/or ServiceRequest.
    """

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

    # Required — FHIR R4 DocumentReference.status is 1..1
    status: Literal["current", "superseded", "entered-in-error"] = Field(
        ...,
        description="current | superseded | entered-in-error",
    )
    doc_status: Optional[str] = Field(
        None, description="preliminary | final | amended | entered-in-error"
    )

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    subject: Optional[str] = Field(None, description="Reference to subject e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    date: Optional[datetime] = None

    authors: Optional[List[DocumentReferenceAuthorInput]] = None
    authenticator: Optional[str] = Field(None, description="Authenticator reference e.g. 'Practitioner/30001'.")
    authenticator_display: Optional[str] = None
    custodian: Optional[str] = Field(None, description="Custodian Organisation reference e.g. 'Organization/190001'.")
    custodian_display: Optional[str] = None

    relates_to: Optional[List[DocumentReferenceRelatesToInput]] = None
    description: Optional[str] = None
    security_labels: Optional[List[DocumentReferenceSecurityLabelInput]] = None

    # Required — FHIR R4 DocumentReference.content is 1..*
    content: List[DocumentReferenceContentInput] = Field(
        ...,
        description="Document content (1..*). Each item must have at least an attachment.url.",
    )

    identifiers: Optional[List[DocumentReferenceIdentifierInput]] = None
    categories: Optional[List[DocumentReferenceCategoryInput]] = None
    context: Optional[DocumentReferenceContextInput] = None


class DocumentReferencePatchSchema(BaseModel):
    """
    Partial update body for a DocumentReference.

    Unlike DiagnosticReport, child arrays (content, authors, security_labels,
    identifiers, categories, context, relates_to) CAN be replaced via PATCH —
    they replace the existing list on the fhir-server when supplied.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[Literal["current", "superseded", "entered-in-error"]] = None
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


class ListDocumentReferencesSchema(BaseModel):
    """
    Query parameters for GET /document-references.

    The fhir-server list endpoint currently supports only pagination.
    """

    model_config = ConfigDict(extra="forbid")

    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)
