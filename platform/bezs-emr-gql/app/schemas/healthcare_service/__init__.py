"""
Public re-exports for the HealthcareService schema package.

Importing from `app.schemas.healthcare_service` instead of the sub-modules avoids
coupling callers to the internal file structure.
"""

from app.schemas.healthcare_service.fhir_schemas import (
    FhirBundleResponse,
    FhirHealthcareServiceResponse,
)
from app.schemas.healthcare_service.input import (
    HealthcareServiceCreateSchema,
    HealthcareServicePatchSchema,
    ListHealthcareServicesSchema,
)
from app.schemas.healthcare_service.response import (
    HealthcareServiceResponse,
    PaginatedHealthcareServiceResponse,
)

__all__ = [
    "HealthcareServiceCreateSchema",
    "HealthcareServicePatchSchema",
    "ListHealthcareServicesSchema",
    "HealthcareServiceResponse",
    "PaginatedHealthcareServiceResponse",
    "FhirHealthcareServiceResponse",
    "FhirBundleResponse",
]
