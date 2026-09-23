from enum import Enum


class ClaimStatus(str, Enum):
    active = "active"
    cancelled = "cancelled"
    draft = "draft"
    entered_in_error = "entered-in-error"


class ClaimUse(str, Enum):
    claim = "claim"
    preauthorization = "preauthorization"
    predetermination = "predetermination"


class ClaimPatientReferenceType(str, Enum):
    Patient = "Patient"


class ClaimEntererReferenceType(str, Enum):
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"


class ClaimProviderReferenceType(str, Enum):
    """Allowed types for claim.provider and careTeam.provider."""
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"


class ClaimPrescriptionReferenceType(str, Enum):
    """Allowed types for prescription and originalPrescription."""
    DeviceRequest = "DeviceRequest"
    MedicationRequest = "MedicationRequest"
    VisionPrescription = "VisionPrescription"


class ClaimReferralReferenceType(str, Enum):
    ServiceRequest = "ServiceRequest"


class ClaimLocationReferenceType(str, Enum):
    """Allowed reference type for facility, accident.location, and item.location."""
    Location = "Location"


class ClaimPayeePartyReferenceType(str, Enum):
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class ClaimRelatedClaimReferenceType(str, Enum):
    Claim = "Claim"


class ClaimDiagnosisConditionReferenceType(str, Enum):
    Condition = "Condition"


class ClaimProcedureReferenceType(str, Enum):
    Procedure = "Procedure"


class ClaimDeviceReferenceType(str, Enum):
    """Allowed reference type for all UDI fields (procedure.udi, item.udi, detail.udi, subDetail.udi)."""
    Device = "Device"


class ClaimInsuranceCoverageReferenceType(str, Enum):
    Coverage = "Coverage"


class ClaimInsuranceClaimResponseReferenceType(str, Enum):
    ClaimResponse = "ClaimResponse"


class ClaimItemEncounterReferenceType(str, Enum):
    Encounter = "Encounter"
