from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── Plain sub-schemas ─────────────────────────────────────────────────────────


class PlainDocumentReferenceIdentifier(BaseModel):
    id: int
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    assigner: Optional[str] = None


class PlainDocumentReferenceCategory(BaseModel):
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainDocumentReferenceAuthor(BaseModel):
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDocumentReferenceRelatesTo(BaseModel):
    id: int
    code: Optional[str] = None
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    target_display: Optional[str] = None


class PlainDocumentReferenceSecurityLabel(BaseModel):
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainDocumentReferenceContent(BaseModel):
    id: int
    attachment_content_type: Optional[str] = None
    attachment_language: Optional[str] = None
    attachment_data: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_size: Optional[int] = None
    attachment_hash: Optional[str] = None
    attachment_title: Optional[str] = None
    attachment_creation: Optional[str] = None
    format_system: Optional[str] = None
    format_version: Optional[str] = None
    format_code: Optional[str] = None
    format_display: Optional[str] = None


class PlainDocumentReferenceContextEncounter(BaseModel):
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainDocumentReferenceContextEvent(BaseModel):
    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainDocumentReferenceContextRelated(BaseModel):
    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


# ── Plain response ─────────────────────────────────────────────────────────────


class PlainDocumentReferenceResponse(BaseModel):
    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None

    master_identifier_use: Optional[str] = None
    master_identifier_type_system: Optional[str] = None
    master_identifier_type_code: Optional[str] = None
    master_identifier_type_display: Optional[str] = None
    master_identifier_type_text: Optional[str] = None
    master_identifier_system: Optional[str] = None
    master_identifier_value: Optional[str] = None
    master_identifier_period_start: Optional[str] = None
    master_identifier_period_end: Optional[str] = None
    master_identifier_assigner: Optional[str] = None

    status: Optional[str] = None
    doc_status: Optional[str] = None

    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None

    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None

    date: Optional[str] = None

    authenticator_type: Optional[str] = None
    authenticator_id: Optional[int] = None
    authenticator_display: Optional[str] = None

    custodian_type: Optional[str] = None
    custodian_id: Optional[int] = None
    custodian_display: Optional[str] = None

    description: Optional[str] = None

    context_period_start: Optional[str] = None
    context_period_end: Optional[str] = None
    context_facility_type_system: Optional[str] = None
    context_facility_type_code: Optional[str] = None
    context_facility_type_display: Optional[str] = None
    context_facility_type_text: Optional[str] = None
    context_practice_setting_system: Optional[str] = None
    context_practice_setting_code: Optional[str] = None
    context_practice_setting_display: Optional[str] = None
    context_practice_setting_text: Optional[str] = None
    context_source_patient_info_type: Optional[str] = None
    context_source_patient_info_id: Optional[int] = None
    context_source_patient_info_display: Optional[str] = None

    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    identifiers: List[PlainDocumentReferenceIdentifier] = []
    categories: List[PlainDocumentReferenceCategory] = []
    authors: List[PlainDocumentReferenceAuthor] = []
    relates_to: List[PlainDocumentReferenceRelatesTo] = []
    security_labels: List[PlainDocumentReferenceSecurityLabel] = []
    content: List[PlainDocumentReferenceContent] = []
    context_encounters: List[PlainDocumentReferenceContextEncounter] = []
    context_events: List[PlainDocumentReferenceContextEvent] = []
    context_related: List[PlainDocumentReferenceContextRelated] = []


class PaginatedDocumentReferenceResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainDocumentReferenceResponse]


# ── FHIR response ─────────────────────────────────────────────────────────────


class FHIRDocumentReferenceSchema(BaseModel):
    resourceType: str = "DocumentReference"
    id: str
    status: Optional[str] = None
    docStatus: Optional[str] = None
    masterIdentifier: Optional[Dict[str, Any]] = None
    identifier: Optional[List[Dict[str, Any]]] = None
    type: Optional[Dict[str, Any]] = None
    category: Optional[List[Dict[str, Any]]] = None
    subject: Optional[Dict[str, Any]] = None
    date: Optional[str] = None
    author: Optional[List[Dict[str, Any]]] = None
    authenticator: Optional[Dict[str, Any]] = None
    custodian: Optional[Dict[str, Any]] = None
    relatesTo: Optional[List[Dict[str, Any]]] = None
    description: Optional[str] = None
    securityLabel: Optional[List[Dict[str, Any]]] = None
    content: List[Dict[str, Any]] = []
    context: Optional[Dict[str, Any]] = None


class FHIRDocumentReferenceBundleEntry(BaseModel):
    resource: FHIRDocumentReferenceSchema


class FHIRDocumentReferenceBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "searchset"
    total: int
    entry: List[FHIRDocumentReferenceBundleEntry] = []
