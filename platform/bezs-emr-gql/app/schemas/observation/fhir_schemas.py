"""
FHIR R4 response schemas for Observation resources — Swagger docs only.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class FhirObservationResponse(BaseModel):
    """Minimal FHIR R4 Observation shape for Swagger documentation."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "Observation"
    id: Optional[str] = None
    status: Optional[str] = None
    code: Optional[Dict[str, Any]] = None
    subject: Optional[Dict[str, Any]] = None
    encounter: Optional[Dict[str, Any]] = None
    effectiveDateTime: Optional[str] = None
    issued: Optional[str] = None
    valueQuantity: Optional[Dict[str, Any]] = None
    category: Optional[List[Dict[str, Any]]] = None
    component: Optional[List[Dict[str, Any]]] = None


class FhirBundleResponse(BaseModel):
    """Minimal FHIR R4 Bundle (searchset) for Observation list endpoint."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "Bundle"
    type: str = "searchset"
    total: Optional[int] = None
    entry: Optional[List[Dict[str, Any]]] = None
