from enum import Enum


class EncounterStatus(str, Enum):
    """FHIR R5 Encounter status value set."""

    planned = "planned"
    in_progress = "in-progress"
    on_hold = "on-hold"
    discharged = "discharged"
    completed = "completed"
    cancelled = "cancelled"
    discontinued = "discontinued"
    entered_in_error = "entered-in-error"
    unknown = "unknown"


class EncounterLocationStatus(str, Enum):
    """FHIR Encounter location status value set."""

    planned = "planned"
    active = "active"
    reserved = "reserved"
    completed = "completed"


class EncounterParticipantReferenceType(str, Enum):
    """FHIR R5 reference types for Encounter.participant.actor."""

    Patient = "Patient"
    Group = "Group"
    RelatedPerson = "RelatedPerson"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Device = "Device"
    HealthcareService = "HealthcareService"


class EncounterBasedOnReferenceType(str, Enum):
    """FHIR R5 reference types for Encounter.basedOn."""

    CarePlan = "CarePlan"
    DeviceRequest = "DeviceRequest"
    MedicationRequest = "MedicationRequest"
    ServiceRequest = "ServiceRequest"
    RequestOrchestration = "RequestOrchestration"
    NutritionOrder = "NutritionOrder"
    VisionPrescription = "VisionPrescription"


class EncounterDiagnosisConditionType(str, Enum):
    """FHIR R5 reference types for Encounter.diagnosis.condition (CodeableReference)."""

    Condition = "Condition"


class EncounterServiceTypeReferenceType(str, Enum):
    """FHIR R5 reference types for Encounter.serviceType.reference (CodeableReference)."""

    HealthcareService = "HealthcareService"


class EncounterReasonValueReferenceType(str, Enum):
    """FHIR R5 reference types for Encounter.reason.value.reference (CodeableReference)."""

    Condition = "Condition"
    DiagnosticReport = "DiagnosticReport"
    Observation = "Observation"
    Procedure = "Procedure"


class EncounterEpisodeOfCareReferenceType(str, Enum):
    """Allowed reference types for Encounter.episodeOfCare[]."""

    EpisodeOfCare = "EpisodeOfCare"


class EncounterCareTeamReferenceType(str, Enum):
    """Allowed reference types for Encounter.careTeam[] — R5 new."""

    CareTeam = "CareTeam"


class EncounterAppointmentReferenceType(str, Enum):
    """Allowed reference types for Encounter.appointment[]."""

    Appointment = "Appointment"


class EncounterAccountReferenceType(str, Enum):
    """Allowed reference types for Encounter.account[]."""

    Account = "Account"


class EncounterLocationReferenceType(str, Enum):
    """Allowed reference types for Encounter.location[].location."""

    Location = "Location"
