"""
FHIR R4 response schemas for DiagnosticReport resources — Swagger docs only.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class FhirDiagnosticReportResponse(BaseModel):
    """Minimal FHIR R4 DiagnosticReport shape for Swagger documentation."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "DiagnosticReport"
    id: Optional[str] = None
    status: Optional[str] = None
    code: Optional[Dict[str, Any]] = None
    subject: Optional[Dict[str, Any]] = None
    encounter: Optional[Dict[str, Any]] = None
    effectiveDateTime: Optional[str] = None
    issued: Optional[str] = None
    basedOn: Optional[List[Dict[str, Any]]] = None
    category: Optional[List[Dict[str, Any]]] = None
    presentedForm: Optional[List[Dict[str, Any]]] = None
    conclusion: Optional[str] = None


class FhirBundleResponse(BaseModel):
    """Minimal FHIR R4 Bundle (searchset) for DiagnosticReport list endpoint."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "Bundle"
    type: str = "searchset"
    total: Optional[int] = None
    entry: Optional[List[Dict[str, Any]]] = None
