"""
FHIR R4/R5 camelCase response schemas for the Encounter resource.

These are thin Pydantic models used only for Swagger UI documentation of the
`application/fhir+json` response variant. The actual FHIR-shaped dict is
built by the fhir-server and proxied through unchanged — these schemas exist
so FastAPI can render accurate OpenAPI docs for the FHIR shape.

For the plain snake_case shape (application/json), see response.py.
"""

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


class FhirEncounterResponse(BaseModel):
    """
    FHIR R5 Encounter resource shape (camelCase, application/fhir+json).

    `extra="allow"` lets the full fhir-server output (contained resources,
    extensions, meta, etc.) pass through without validation errors.
    """

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    resourceType: str = Field("Encounter", description="Always 'Encounter'.")
    id: str = Field(..., description="Public encounter_id as a string.")
    status: str = Field(..., description="R5 status value.")
    # class is a Python reserved word — alias handles serialisation
    class_: Optional[List[Dict[str, Any]]] = Field(None, alias="class")
    type: Optional[List[Dict[str, Any]]] = None
    serviceType: Optional[List[Dict[str, Any]]] = None
    priority: Optional[Dict[str, Any]] = None
    subject: Optional[Dict[str, Any]] = None
    participant: Optional[List[Dict[str, Any]]] = None
    appointment: Optional[List[Dict[str, Any]]] = None
    actualPeriod: Optional[Dict[str, Any]] = None
    reason: Optional[List[Dict[str, Any]]] = None
    diagnosis: Optional[List[Dict[str, Any]]] = None
    location: Optional[List[Dict[str, Any]]] = None
    serviceProvider: Optional[Dict[str, Any]] = None


class FhirBundleResponse(BaseModel):
    """
    FHIR Bundle searchset response for GET /encounters (application/fhir+json).

    `extra="allow"` lets the full bundle (link, meta, etc.) pass through.
    """

    model_config = ConfigDict(extra="allow")

    resourceType: str = Field("Bundle", description="Always 'Bundle'.")
    type: str = Field("searchset", description="Always 'searchset' for list responses.")
    total: Optional[int] = None
    entry: Optional[List[Dict[str, Any]]] = None
