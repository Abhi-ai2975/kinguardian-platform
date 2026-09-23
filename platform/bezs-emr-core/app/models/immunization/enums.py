from enum import Enum


class ImmunizationStatus(str, Enum):
    completed = "completed"
    entered_in_error = "entered-in-error"
    not_done = "not-done"


class ImmunizationPatientReferenceType(str, Enum):
    """Allowed reference type for Immunization.patient."""

    Patient = "Patient"


class ImmunizationLocationReferenceType(str, Enum):
    """Allowed reference type for Immunization.location."""

    Location = "Location"


class ImmunizationPerformerActorReferenceType(str, Enum):
    """Allowed reference types for Immunization.performer.actor."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"


class ImmunizationReasonReferenceType(str, Enum):
    """Allowed reference types for Immunization.reasonReference."""

    Condition = "Condition"
    Observation = "Observation"
    DiagnosticReport = "DiagnosticReport"


class ImmunizationReactionDetailReferenceType(str, Enum):
    """Allowed reference type for Immunization.reaction.detail."""

    Observation = "Observation"
