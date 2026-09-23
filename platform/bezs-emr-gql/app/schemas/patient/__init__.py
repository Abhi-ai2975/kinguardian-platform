"""
Public API for the patient schemas package.

Exports all input schemas, response models, and FHIR shapes so that
routers and services can import from `app.schemas.patient` directly
without knowing which sub-module each class lives in.
"""

from app.schemas.patient.enums import (
    GeneralPractitionerReferenceType,
    PatientLinkOtherType,
    PatientLinkType,
)
from app.schemas.patient.fhir_schemas import FhirBundleResponse, FhirPatientResponse
from app.schemas.patient.input import (
    AddressCreateSchema,
    AddressPatchSchema,
    CommunicationCreateSchema,
    CommunicationPatchSchema,
    ContactCreateSchema,
    ContactPatchSchema,
    GeneralPractitionerCreateSchema,
    GeneralPractitionerPatchSchema,
    IdentifierCreateSchema,
    IdentifierPatchSchema,
    LinkCreateSchema,
    LinkPatchSchema,
    ListPatientsSchema,
    NameCreateSchema,
    NamePatchSchema,
    PatientCreateSchema,
    PatientFullCreateSchema,
    PatientPatchSchema,
    PhotoCreateSchema,
    PhotoPatchSchema,
    TelecomCreateSchema,
    TelecomPatchSchema,
)
from app.schemas.patient.response import (
    PaginatedPatientResponse,
    PatientAddressListResponse,
    PatientAddressResponse,
    PatientCommunicationListResponse,
    PatientCommunicationResponse,
    PatientContactListResponse,
    PatientContactResponse,
    PatientGeneralPractitionerListResponse,
    PatientGeneralPractitionerResponse,
    PatientIdentifierListResponse,
    PatientIdentifierResponse,
    PatientLinkListResponse,
    PatientLinkResponse,
    PatientNameListResponse,
    PatientNameResponse,
    PatientPhotoListResponse,
    PatientPhotoResponse,
    PatientResponse,
    PatientTelecomListResponse,
    PatientTelecomResponse,
)

__all__ = [
    # Enums
    "GeneralPractitionerReferenceType",
    "PatientLinkOtherType",
    "PatientLinkType",
    # Input — top-level
    "PatientCreateSchema",
    "PatientFullCreateSchema",
    "PatientPatchSchema",
    "ListPatientsSchema",
    # Input — sub-resources
    "NameCreateSchema",
    "NamePatchSchema",
    "IdentifierCreateSchema",
    "IdentifierPatchSchema",
    "TelecomCreateSchema",
    "TelecomPatchSchema",
    "AddressCreateSchema",
    "AddressPatchSchema",
    "PhotoCreateSchema",
    "PhotoPatchSchema",
    "ContactCreateSchema",
    "ContactPatchSchema",
    "CommunicationCreateSchema",
    "CommunicationPatchSchema",
    "GeneralPractitionerCreateSchema",
    "GeneralPractitionerPatchSchema",
    "LinkCreateSchema",
    "LinkPatchSchema",
    # Response — top-level
    "PatientResponse",
    "PaginatedPatientResponse",
    # Response — sub-resources
    "PatientNameResponse",
    "PatientNameListResponse",
    "PatientIdentifierResponse",
    "PatientIdentifierListResponse",
    "PatientTelecomResponse",
    "PatientTelecomListResponse",
    "PatientAddressResponse",
    "PatientAddressListResponse",
    "PatientPhotoResponse",
    "PatientPhotoListResponse",
    "PatientContactResponse",
    "PatientContactListResponse",
    "PatientCommunicationResponse",
    "PatientCommunicationListResponse",
    "PatientGeneralPractitionerResponse",
    "PatientGeneralPractitionerListResponse",
    "PatientLinkResponse",
    "PatientLinkListResponse",
    # FHIR
    "FhirPatientResponse",
    "FhirBundleResponse",
]
