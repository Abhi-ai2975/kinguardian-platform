"""
ServiceRequest schema package — re-exports public input schemas.

All create/patch schemas are defined in input.py; response schemas live in
response.py; FHIR response schemas for Swagger docs are in fhir_schemas.py.
"""

from app.schemas.service_request.input import (
    ServiceRequestCreateSchema,
    ServiceRequestPatchSchema,
)

__all__ = [
    "ServiceRequestCreateSchema",
    "ServiceRequestPatchSchema",
]
