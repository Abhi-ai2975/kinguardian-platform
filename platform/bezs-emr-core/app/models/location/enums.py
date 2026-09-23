from enum import Enum


class LocationStatus(str, Enum):
    """FHIR R4 Location.status value set — general availability."""

    active = "active"
    suspended = "suspended"
    inactive = "inactive"


class LocationMode(str, Enum):
    """FHIR R4 Location.mode value set — instance or kind."""

    instance = "instance"
    kind = "kind"


class LocationPartOfReferenceType(str, Enum):
    """Allowed reference types for Location.partOf."""

    Location = "Location"


class LocationEndpointReferenceType(str, Enum):
    """Allowed reference types for Location.endpoint[]."""

    Endpoint = "Endpoint"
