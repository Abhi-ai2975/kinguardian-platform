"""
Public re-exports for the Location schema package.

Importing from `app.schemas.location` instead of the sub-modules avoids
coupling callers to the internal file structure.
"""

from app.schemas.location.fhir_schemas import FhirBundleResponse, FhirLocationResponse
from app.schemas.location.input import (
    ListLocationsSchema,
    LocationCreateSchema,
    LocationPatchSchema,
)
from app.schemas.location.response import LocationResponse, PaginatedLocationResponse

__all__ = [
    "LocationCreateSchema",
    "LocationPatchSchema",
    "ListLocationsSchema",
    "LocationResponse",
    "PaginatedLocationResponse",
    "FhirLocationResponse",
    "FhirBundleResponse",
]
