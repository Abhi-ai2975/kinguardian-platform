from enum import Enum


class DiagnosticReportStatus(str, Enum):
    """FHIR R4 DiagnosticReport status value set (full set)."""

    registered = "registered"
    partial = "partial"
    preliminary = "preliminary"
    final = "final"
    amended = "amended"
    corrected = "corrected"
    appended = "appended"
    cancelled = "cancelled"
    entered_in_error = "entered-in-error"
    unknown = "unknown"


class DiagnosticReportSubjectType(str, Enum):
    """Allowed subject reference types for DiagnosticReport.subject."""

    Patient = "Patient"
    Group = "Group"
    Device = "Device"
    Location = "Location"


class DiagnosticReportParticipantType(str, Enum):
    """Allowed reference types for DiagnosticReport.performer and resultsInterpreter."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    CareTeam = "CareTeam"


class DiagnosticReportBasedOnReferenceType(str, Enum):
    """Allowed reference types for DiagnosticReport.basedOn[]."""

    CarePlan = "CarePlan"
    ImmunizationRecommendation = "ImmunizationRecommendation"
    MedicationRequest = "MedicationRequest"
    NutritionOrder = "NutritionOrder"
    ServiceRequest = "ServiceRequest"


class DiagnosticReportSpecimenReferenceType(str, Enum):
    """Allowed reference types for DiagnosticReport.specimen[]."""

    Specimen = "Specimen"


class DiagnosticReportResultReferenceType(str, Enum):
    """Allowed reference types for DiagnosticReport.result[]."""

    Observation = "Observation"


class DiagnosticReportImagingStudyReferenceType(str, Enum):
    """Allowed reference types for DiagnosticReport.imagingStudy[]."""

    ImagingStudy = "ImagingStudy"


class DiagnosticReportMediaLinkReferenceType(str, Enum):
    """Allowed reference types for DiagnosticReport.media[].link."""

    Media = "Media"
