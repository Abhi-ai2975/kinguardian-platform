"""
Public API for the Practitioner schemas package.

Import from here rather than from sub-modules to insulate callers from
internal reorganisation.
"""

from app.schemas.practitioner.fhir_schemas import FhirBundleResponse, FhirPractitionerResponse
from app.schemas.practitioner.input import (
    ListPractitionersSchema,
    PractitionerAddressCreateSchema,
    PractitionerAddressPatchSchema,
    PractitionerCommunicationCreateSchema,
    PractitionerCommunicationPatchSchema,
    PractitionerCreateSchema,
    PractitionerFullCreateSchema,
    PractitionerIdentifierCreateSchema,
    PractitionerIdentifierPatchSchema,
    PractitionerNameCreateSchema,
    PractitionerNamePatchSchema,
    PractitionerPatchSchema,
    PractitionerPhotoCreateSchema,
    PractitionerPhotoPatchSchema,
    PractitionerQualificationCreateSchema,
    PractitionerQualificationPatchSchema,
    PractitionerTelecomCreateSchema,
    PractitionerTelecomPatchSchema,
    QualificationIdentifierInput,
)
from app.schemas.practitioner.response import (
    PaginatedPractitionerResponse,
    PlainPractitionerAddress,
    PlainPractitionerCommunication,
    PlainPractitionerIdentifier,
    PlainPractitionerName,
    PlainPractitionerPhoto,
    PlainPractitionerTelecom,
    PlainQualification,
    PlainQualificationIdentifier,
    PractitionerAddressListResponse,
    PractitionerCommunicationListResponse,
    PractitionerIdentifierListResponse,
    PractitionerNameListResponse,
    PractitionerPhotoListResponse,
    PractitionerQualificationListResponse,
    PractitionerResponse,
    PractitionerTelecomListResponse,
)

__all__ = [
    # ── Input schemas (request body validation) ───────────────────────────────
    "PractitionerCreateSchema",
    "PractitionerFullCreateSchema",
    "PractitionerPatchSchema",
    "ListPractitionersSchema",
    # Sub-resource create schemas
    "PractitionerNameCreateSchema",
    "PractitionerIdentifierCreateSchema",
    "PractitionerTelecomCreateSchema",
    "PractitionerAddressCreateSchema",
    "PractitionerPhotoCreateSchema",
    "QualificationIdentifierInput",
    "PractitionerQualificationCreateSchema",
    "PractitionerCommunicationCreateSchema",
    # Sub-resource patch schemas
    "PractitionerNamePatchSchema",
    "PractitionerIdentifierPatchSchema",
    "PractitionerTelecomPatchSchema",
    "PractitionerAddressPatchSchema",
    "PractitionerPhotoPatchSchema",
    "PractitionerQualificationPatchSchema",
    "PractitionerCommunicationPatchSchema",
    # ── Plain JSON response schemas (application/json) ─────────────────────────
    "PractitionerResponse",
    "PaginatedPractitionerResponse",
    # Individual sub-resource response models
    "PlainPractitionerName",
    "PlainPractitionerIdentifier",
    "PlainPractitionerTelecom",
    "PlainPractitionerAddress",
    "PlainPractitionerPhoto",
    "PlainQualificationIdentifier",
    "PlainQualification",
    "PlainPractitionerCommunication",
    # Sub-resource list response wrappers
    "PractitionerNameListResponse",
    "PractitionerIdentifierListResponse",
    "PractitionerTelecomListResponse",
    "PractitionerAddressListResponse",
    "PractitionerPhotoListResponse",
    "PractitionerQualificationListResponse",
    "PractitionerCommunicationListResponse",
    # ── FHIR R4 response schemas (application/fhir+json) ──────────────────────
    "FhirPractitionerResponse",
    "FhirBundleResponse",
]
