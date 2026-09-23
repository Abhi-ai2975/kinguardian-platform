from enum import Enum


class ProcedureStatus(str, Enum):
    """FHIR R4 Procedure status value set."""

    preparation = "preparation"
    in_progress = "in-progress"
    not_done = "not-done"
    on_hold = "on-hold"
    stopped = "stopped"
    completed = "completed"
    entered_in_error = "entered-in-error"
    unknown = "unknown"


class ProcedureSubjectType(str, Enum):
    """Allowed subject reference types for Procedure.subject (R4)."""

    Patient = "Patient"
    Group = "Group"


class ProcedureRecorderType(str, Enum):
    """Allowed reference types for Procedure.recorder."""

    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"


class ProcedureAsserterType(str, Enum):
    """Allowed reference types for Procedure.asserter."""

    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"


class ProcedureLocationReferenceType(str, Enum):
    """Allowed reference types for Procedure.location."""

    Location = "Location"


class ProcedurePerformerActorType(str, Enum):
    """Allowed reference types for Procedure.performer.actor."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Device = "Device"


class ProcedurePerformerOnBehalfOfType(str, Enum):
    """Allowed reference types for Procedure.performer.onBehalfOf."""

    Organization = "Organization"


class ProcedureBasedOnReferenceType(str, Enum):
    """Allowed reference types for Procedure.basedOn[]."""

    CarePlan = "CarePlan"
    ServiceRequest = "ServiceRequest"


class ProcedurePartOfReferenceType(str, Enum):
    """Allowed reference types for Procedure.partOf[]."""

    Procedure = "Procedure"
    Observation = "Observation"
    MedicationAdministration = "MedicationAdministration"


class ProcedureReasonReferenceType(str, Enum):
    """Allowed reference types for Procedure.reasonReference[]."""

    Condition = "Condition"
    Observation = "Observation"
    Procedure = "Procedure"
    DiagnosticReport = "DiagnosticReport"
    DocumentReference = "DocumentReference"


class ProcedureReportReferenceType(str, Enum):
    """Allowed reference types for Procedure.report[]."""

    DiagnosticReport = "DiagnosticReport"
    DocumentReference = "DocumentReference"
    Composition = "Composition"


class ProcedureComplicationDetailReferenceType(str, Enum):
    """Allowed reference types for Procedure.complicationDetail[]."""

    Condition = "Condition"


class ProcedureNoteAuthorReferenceType(str, Enum):
    """Allowed reference types for Procedure.note[].author (Annotation.authorReference)."""

    Practitioner = "Practitioner"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"


class ProcedureFocalDeviceManipulatedReferenceType(str, Enum):
    """Allowed reference types for Procedure.focalDevice[].manipulated."""

    Device = "Device"


class ProcedureUsedReferenceType(str, Enum):
    """Allowed reference types for Procedure.usedReference[]."""

    Device = "Device"
    Medication = "Medication"
    Substance = "Substance"
