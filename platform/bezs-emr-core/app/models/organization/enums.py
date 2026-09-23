from enum import Enum


class OrganizationEndpointReferenceType(str, Enum):
    """Allowed reference type for Organization.endpoint."""
    Endpoint = "Endpoint"
