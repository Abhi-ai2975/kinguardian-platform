"""
FHIR R4 response schemas for Condition resources — Swagger docs only.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class FhirConditionResponse(BaseModel):
    """Minimal FHIR R4 Condition shape for Swagger documentation."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "Condition"
    id: Optional[str] = None
    clinicalStatus: Optional[Dict[str, Any]] = None
    verificationStatus: Optional[Dict[str, Any]] = None
    code: Optional[Dict[str, Any]] = None
    subject: Optional[Dict[str, Any]] = None
    encounter: Optional[Dict[str, Any]] = None
    recordedDate: Optional[str] = None
    category: Optional[List[Dict[str, Any]]] = None
    stage: Optional[List[Dict[str, Any]]] = None


class FhirBundleResponse(BaseModel):
    """Minimal FHIR R4 Bundle (searchset) for Condition list endpoint."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "Bundle"
    type: str = "searchset"
    total: Optional[int] = None
    entry: Optional[List[Dict[str, Any]]] = None
