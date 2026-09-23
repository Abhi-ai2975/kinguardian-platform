from enum import Enum


class DayOfWeek(str, Enum):
    mon = "mon"
    tue = "tue"
    wed = "wed"
    thu = "thu"
    fri = "fri"
    sat = "sat"
    sun = "sun"


class PractitionerRoleLocationReferenceType(str, Enum):
    """Allowed reference types for PractitionerRole.location[]."""

    Location = "Location"


class PractitionerRoleHealthcareServiceReferenceType(str, Enum):
    """Allowed reference types for PractitionerRole.healthcareService[]."""

    HealthcareService = "HealthcareService"


class PractitionerRoleEndpointReferenceType(str, Enum):
    """Allowed reference types for PractitionerRole.endpoint[]."""

    Endpoint = "Endpoint"
