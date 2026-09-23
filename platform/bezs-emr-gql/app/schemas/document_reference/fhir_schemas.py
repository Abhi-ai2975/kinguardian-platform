"""
FHIR R4 response schemas for DocumentReference resources — Swagger docs only.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class FhirDocumentReferenceResponse(BaseModel):
    """Minimal FHIR R4 DocumentReference shape for Swagger documentation."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "DocumentReference"
    id: Optional[str] = None
    status: Optional[str] = None
    docStatus: Optional[str] = None
    type: Optional[Dict[str, Any]] = None
    subject: Optional[Dict[str, Any]] = None
    date: Optional[str] = None
    description: Optional[str] = None
    content: Optional[List[Dict[str, Any]]] = None
    context: Optional[Dict[str, Any]] = None


class FhirBundleResponse(BaseModel):
    """Minimal FHIR R4 Bundle (searchset) for DocumentReference list endpoint."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "Bundle"
    type: str = "searchset"
    total: Optional[int] = None
    entry: Optional[List[Dict[str, Any]]] = None
