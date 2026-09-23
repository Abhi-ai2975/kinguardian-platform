"""
FHIR R4 response schemas for MedicationRequest resources — Swagger docs only.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class FhirMedicationRequestResponse(BaseModel):
    """Minimal FHIR R4 MedicationRequest shape for Swagger documentation."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "MedicationRequest"
    id: Optional[str] = None
    status: Optional[str] = None
    intent: Optional[str] = None
    medicationCodeableConcept: Optional[Dict[str, Any]] = None
    medicationReference: Optional[Dict[str, Any]] = None
    subject: Optional[Dict[str, Any]] = None
    encounter: Optional[Dict[str, Any]] = None
    authoredOn: Optional[str] = None
    requester: Optional[Dict[str, Any]] = None
    dosageInstruction: Optional[List[Dict[str, Any]]] = None


class FhirBundleResponse(BaseModel):
    """Minimal FHIR R4 Bundle (searchset) for MedicationRequest list endpoint."""

    model_config = ConfigDict(extra="allow")

    resourceType: str = "Bundle"
    type: str = "searchset"
    total: Optional[int] = None
    entry: Optional[List[Dict[str, Any]]] = None
