from enum import Enum


class MedicationRequestStatus(str, Enum):
    """FHIR R4 MedicationRequest status value set."""

    active = "active"
    on_hold = "on-hold"
    cancelled = "cancelled"
    completed = "completed"
    entered_in_error = "entered-in-error"
    stopped = "stopped"
    draft = "draft"
    unknown = "unknown"


class MedicationRequestIntent(str, Enum):
    """FHIR R4 MedicationRequest intent value set."""

    proposal = "proposal"
    plan = "plan"
    order = "order"
    original_order = "original-order"
    reflex_order = "reflex-order"
    filler_order = "filler-order"
    instance_order = "instance-order"
    option = "option"


class MedicationRequestPriority(str, Enum):
    """FHIR R4 request priority value set."""

    routine = "routine"
    urgent = "urgent"
    asap = "asap"
    stat = "stat"


class MedicationSubjectType(str, Enum):
    """Allowed subject reference types for MedicationRequest.subject."""

    Patient = "Patient"
    Group = "Group"


class MedicationRequesterType(str, Enum):
    """Allowed reference types for MedicationRequest.requester."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Device = "Device"


class MedicationPerformerType(str, Enum):
    """Allowed reference types for MedicationRequest.performer (R4 single performer)."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    Patient = "Patient"
    Device = "Device"
    RelatedPerson = "RelatedPerson"
    CareTeam = "CareTeam"


class MedicationRecorderType(str, Enum):
    """Allowed reference types for MedicationRequest.recorder."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"


class MedicationReportedReferenceType(str, Enum):
    """Allowed reference types for MedicationRequest.reportedReference."""

    Patient = "Patient"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"


class MedicationRequestMedicationReferenceType(str, Enum):
    """Allowed reference types for MedicationRequest.medicationReference."""

    Medication = "Medication"


class MedicationRequestPriorPrescriptionType(str, Enum):
    """Allowed reference types for MedicationRequest.priorPrescription."""

    MedicationRequest = "MedicationRequest"


class MedicationRequestReasonReferenceType(str, Enum):
    """Allowed reference types for MedicationRequest.reasonReference[]."""

    Condition = "Condition"
    Observation = "Observation"


class MedicationRequestBasedOnReferenceType(str, Enum):
    """Allowed reference types for MedicationRequest.basedOn[]."""

    CarePlan = "CarePlan"
    MedicationRequest = "MedicationRequest"
    ServiceRequest = "ServiceRequest"
    ImmunizationRecommendation = "ImmunizationRecommendation"


class MedicationRequestInsuranceReferenceType(str, Enum):
    """Allowed reference types for MedicationRequest.insurance[]."""

    Coverage = "Coverage"
    ClaimResponse = "ClaimResponse"


class MedicationRequestNoteAuthorReferenceType(str, Enum):
    """Allowed reference types for MedicationRequest.note[].author (Annotation.authorReference)."""

    Practitioner = "Practitioner"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"


class MedicationRequestDetectedIssueReferenceType(str, Enum):
    """Allowed reference types for MedicationRequest.detectedIssue[]."""

    DetectedIssue = "DetectedIssue"


class MedicationRequestEventHistoryReferenceType(str, Enum):
    """Allowed reference types for MedicationRequest.eventHistory[]."""

    Provenance = "Provenance"


class MedicationRequestDispensePerformerType(str, Enum):
    """Allowed reference types for MedicationRequest.dispenseRequest.performer."""

    Organization = "Organization"
