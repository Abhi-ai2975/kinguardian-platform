from enum import Enum


class AuditEventWhoReferenceType(str, Enum):
    """Allowed reference types for AuditEvent.agent.who and AuditEvent.source.observer."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    Device = "Device"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class AuditEventLocationReferenceType(str, Enum):
    """Allowed reference type for AuditEvent.agent.location."""

    Location = "Location"
