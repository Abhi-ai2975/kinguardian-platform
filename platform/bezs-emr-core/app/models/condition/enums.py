from enum import Enum


class ConditionSubjectType(str, Enum):
    """Allowed subject reference types for Condition.subject."""

    Patient = "Patient"
    Group = "Group"


class ConditionRecorderType(str, Enum):
    """Allowed reference types for Condition.recorder."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class ConditionAsserterType(str, Enum):
    """Allowed reference types for Condition.asserter (same set as recorder)."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class ConditionStageAssessmentType(str, Enum):
    """Allowed reference types for Condition.stage.assessment."""

    ClinicalImpression = "ClinicalImpression"
    DiagnosticReport = "DiagnosticReport"
    Observation = "Observation"


class ConditionNoteAuthorReferenceType(str, Enum):
    """Allowed reference types for Condition.note[].author (Annotation.authorReference)."""

    Practitioner = "Practitioner"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"
