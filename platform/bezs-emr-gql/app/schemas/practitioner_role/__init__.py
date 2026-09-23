"""
Public API for the PractitionerRole schemas package.

Import from here rather than from sub-modules to insulate callers from
internal reorganisation.
"""

from app.schemas.practitioner_role.fhir_schemas import FhirBundleResponse, FhirPractitionerRoleResponse
from app.schemas.practitioner_role.input import (
    ListPractitionerRolesSchema,
    PractitionerRoleCreateSchema,
    PractitionerRolePatchSchema,
)
from app.schemas.practitioner_role.response import PaginatedPractitionerRoleResponse, PractitionerRoleResponse

__all__ = [
    # Input schemas — used for request body validation
    "PractitionerRoleCreateSchema",
    "PractitionerRolePatchSchema",
    "ListPractitionerRolesSchema",
    # Plain JSON response schemas — Swagger documentation (application/json)
    "PractitionerRoleResponse",
    "PaginatedPractitionerRoleResponse",
    # FHIR R4 response schemas — Swagger documentation (application/fhir+json)
    "FhirPractitionerRoleResponse",
    "FhirBundleResponse",
]
