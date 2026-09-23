"""
FHIR R4 response schemas for ServiceRequest resources — Swagger docs only.

These schemas describe the shape of fhir-server responses when the caller sends
`Accept: application/fhir+json`. They are used exclusively in FastAPI route
`responses=` descriptors so Swagger UI can render both content variants.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class FhirServiceRequestResponse(BaseModel):
    """
    Minimal FHIR R4 ServiceRequest resource shape for Swagger documentation.

    `extra="allow"` accepts the full FHIR payload without needing to enumerate
    every possible extension or modifier extension field.
    """

    model_config = ConfigDict(extra="allow")

    resourceType: str = "ServiceRequest"
    id: Optional[str] = None
    status: Optional[str] = None
    intent: Optional[str] = None
    priority: Optional[str] = None
    code: Optional[Dict[str, Any]] = None
    subject: Optional[Dict[str, Any]] = None
    encounter: Optional[Dict[str, Any]] = None
    authoredOn: Optional[str] = None
    requester: Optional[Dict[str, Any]] = None
    performer: Optional[List[Dict[str, Any]]] = None
    category: Optional[List[Dict[str, Any]]] = None
    note: Optional[List[Dict[str, Any]]] = None


class FhirBundleResponse(BaseModel):
    """
    Minimal FHIR R4 Bundle (searchset) shape for ServiceRequest list endpoint.

    Matches the structure returned by the fhir-server when the caller sends
    `Accept: application/fhir+json` on the list endpoint.
    """

    model_config = ConfigDict(extra="allow")

    resourceType: str = "Bundle"
    type: str = "searchset"
    total: Optional[int] = None
    entry: Optional[List[Dict[str, Any]]] = None
