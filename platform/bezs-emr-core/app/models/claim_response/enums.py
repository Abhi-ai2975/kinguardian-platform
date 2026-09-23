from enum import Enum


class ClaimResponseStatus(str, Enum):
    active = "active"
    cancelled = "cancelled"
    draft = "draft"
    entered_in_error = "entered-in-error"


class ClaimResponseUse(str, Enum):
    claim = "claim"
    preauthorization = "preauthorization"
    predetermination = "predetermination"


class ClaimResponseOutcome(str, Enum):
    queued = "queued"
    complete = "complete"
    error = "error"
    partial = "partial"


class ClaimResponsePatientReferenceType(str, Enum):
    Patient = "Patient"


class ClaimResponseRequestorReferenceType(str, Enum):
    """Allowed types for ClaimResponse.requestor."""
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"


class ClaimResponseRequestReferenceType(str, Enum):
    Claim = "Claim"


class ClaimResponseAddItemProviderReferenceType(str, Enum):
    """Allowed types for ClaimResponse.addItem.provider."""
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"


class ClaimResponseAddItemLocationReferenceType(str, Enum):
    """Allowed Reference type for ClaimResponse.addItem.location[x] Reference variant."""
    Location = "Location"


class ClaimResponseInsuranceCoverageReferenceType(str, Enum):
    Coverage = "Coverage"


class ClaimResponseInsuranceClaimResponseReferenceType(str, Enum):
    ClaimResponse = "ClaimResponse"


class ClaimResponseCommunicationRequestReferenceType(str, Enum):
    CommunicationRequest = "CommunicationRequest"
