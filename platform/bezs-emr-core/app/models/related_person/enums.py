from enum import Enum


class RelatedPersonPatientReferenceType(str, Enum):
    """Allowed reference types for RelatedPerson.patient."""

    Patient = "Patient"
