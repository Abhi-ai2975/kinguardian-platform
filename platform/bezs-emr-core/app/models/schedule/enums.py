from enum import Enum


class ScheduleActorReferenceType(str, Enum):
    """Allowed reference types for Schedule.actor."""
    Patient = "Patient"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    RelatedPerson = "RelatedPerson"
    Device = "Device"
    HealthcareService = "HealthcareService"
    Location = "Location"
