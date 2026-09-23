from enum import Enum


class HealthcareServiceLocationReferenceType(str, Enum):
    """Allowed reference types for HealthcareService.location[]."""

    Location = "Location"


class HealthcareServiceCoverageAreaReferenceType(str, Enum):
    """Allowed reference types for HealthcareService.coverageArea[]."""

    Location = "Location"


class HealthcareServiceEndpointReferenceType(str, Enum):
    """Allowed reference types for HealthcareService.endpoint[]."""

    Endpoint = "Endpoint"
