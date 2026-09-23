from enum import Enum


class CoverageStatus(str, Enum):
    """FHIR R4 Coverage.status value set (FM Status — Required)."""

    active = "active"
    cancelled = "cancelled"
    draft = "draft"
    entered_in_error = "entered-in-error"


class CoveragePolicyHolderReferenceType(str, Enum):
    """Allowed reference types for Coverage.policyHolder."""

    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"


class CoverageSubscriberReferenceType(str, Enum):
    """Allowed reference types for Coverage.subscriber."""

    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class CoverageBeneficiaryReferenceType(str, Enum):
    """Allowed reference types for Coverage.beneficiary."""

    Patient = "Patient"


class CoveragePayorReferenceType(str, Enum):
    """Allowed reference types for Coverage.payor[]."""

    Organization = "Organization"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class CoverageContractReferenceType(str, Enum):
    """Allowed reference types for Coverage.contract[]."""

    Contract = "Contract"
