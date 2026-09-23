"""
Response schemas for DocumentReference resources.

`extra="allow"` on every schema ensures forward-compatibility with fhir-server additions.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


# ── Plain sub-resource response schemas ───────────────────────────────────────


class PlainDocumentReferenceAttachment(BaseModel):
    """Attachment details within a content entry."""

    model_config = ConfigDict(extra="allow")

    content_type: Optional[str] = None
    language: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


class PlainDocumentReferenceContent(BaseModel):
    """Content entry with attachment and optional format metadata."""

    model_config = ConfigDict(extra="allow")

    id: Optional[int] = None
    attachment: Optional[PlainDocumentReferenceAttachment] = None
    format_system: Optional[str] = None
    format_version: Optional[str] = None
    format_code: Optional[str] = None
    format_display: Optional[str] = None


class PlainDocumentReferenceContextRelated(BaseModel):
    """Related resource link within the context."""

    model_config = ConfigDict(extra="allow")

    reference: Optional[str] = None
    display: Optional[str] = None


# ── Top-level response schemas ────────────────────────────────────────────────


class DocumentReferenceResponse(BaseModel):
    """
    Plain snake_case response for a single DocumentReference.

    `extra="allow"` ensures forward-compatibility with fhir-server additions.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
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
    description: Optional[str] = None
    authenticator: Optional[str] = None
    authenticator_display: Optional[str] = None
    custodian: Optional[str] = None
    custodian_display: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    content: Optional[List[PlainDocumentReferenceContent]] = None
    authors: Optional[List[Dict[str, Any]]] = None
    security_labels: Optional[List[Dict[str, Any]]] = None
    identifiers: Optional[List[Dict[str, Any]]] = None
    categories: Optional[List[Dict[str, Any]]] = None
    relates_to: Optional[List[Dict[str, Any]]] = None
    context: Optional[Dict[str, Any]] = None


class PaginatedDocumentReferenceResponse(BaseModel):
    """Paginated list wrapper for DocumentReference resources."""

    model_config = ConfigDict(extra="allow")

    total: int
    limit: int
    offset: int
    data: List[DocumentReferenceResponse]
