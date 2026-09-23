from enum import Enum


class AllergyIntoleranceType(str, Enum):
    """FHIR R4 AllergyIntolerance.type — allergy | intolerance."""

    allergy = "allergy"
    intolerance = "intolerance"


class AllergyIntoleranceCriticality(str, Enum):
    """FHIR R4 AllergyIntolerance.criticality."""

    low = "low"
    high = "high"
    unable_to_assess = "unable-to-assess"


class AllergyIntoleranceCategoryCode(str, Enum):
    """Allowed values for AllergyIntolerance.category[]."""

    food = "food"
    medication = "medication"
    environment = "environment"
    biologic = "biologic"


class AllergyIntoleranceReactionSeverity(str, Enum):
    """FHIR R4 AllergyIntolerance.reaction.severity."""

    mild = "mild"
    moderate = "moderate"
    severe = "severe"


class AllergyIntolerancePatientReferenceType(str, Enum):
    """Allowed reference type for AllergyIntolerance.patient (1..1)."""

    Patient = "Patient"


class AllergyIntoleranceParticipantReferenceType(str, Enum):
    """Allowed reference types for AllergyIntolerance.recorder and asserter.

    Shared PG enum type 'allergy_intolerance_participant_reference_type'
    used for both recorder_type and asserter_type columns (second uses create_type=False).
    """

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
