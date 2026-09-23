from enum import Enum


class ServiceRequestStatus(str, Enum):
    """FHIR R4 ServiceRequest status value set."""

    draft = "draft"
    active = "active"
    on_hold = "on-hold"
    revoked = "revoked"
    completed = "completed"
    entered_in_error = "entered-in-error"
    unknown = "unknown"


class ServiceRequestIntent(str, Enum):
    """FHIR R4 ServiceRequest intent value set."""

    proposal = "proposal"
    plan = "plan"
    directive = "directive"
    order = "order"
    original_order = "original-order"
    reflex_order = "reflex-order"
    filler_order = "filler-order"
    instance_order = "instance-order"
    option = "option"


class ServiceRequestPriority(str, Enum):
    """FHIR R4 request priority value set."""

    routine = "routine"
    urgent = "urgent"
    asap = "asap"
    stat = "stat"


class ServiceRequestSubjectType(str, Enum):
    """Allowed subject reference types for ServiceRequest.subject."""

    Patient = "Patient"
    Group = "Group"
    Location = "Location"
    Device = "Device"


class ServiceRequestRequesterType(str, Enum):
    """Allowed reference types for ServiceRequest.requester."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Device = "Device"


class ServiceRequestPerformerReferenceType(str, Enum):
    """Allowed reference types for ServiceRequest.performer[]."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    CareTeam = "CareTeam"
    HealthcareService = "HealthcareService"
    Patient = "Patient"
    Device = "Device"
    RelatedPerson = "RelatedPerson"


class ServiceRequestBasedOnReferenceType(str, Enum):
    """Allowed reference types for ServiceRequest.basedOn[]."""

    CarePlan = "CarePlan"
    ServiceRequest = "ServiceRequest"
    MedicationRequest = "MedicationRequest"


class ServiceRequestReplacesReferenceType(str, Enum):
    """Allowed reference types for ServiceRequest.replaces[]."""

    ServiceRequest = "ServiceRequest"


class ServiceRequestReasonReferenceType(str, Enum):
    """Allowed reference types for ServiceRequest.reasonReference[]."""

    Condition = "Condition"
    Observation = "Observation"
    DiagnosticReport = "DiagnosticReport"
    DocumentReference = "DocumentReference"


class ServiceRequestInsuranceReferenceType(str, Enum):
    """Allowed reference types for ServiceRequest.insurance[]."""

    Coverage = "Coverage"
    ClaimResponse = "ClaimResponse"


class ServiceRequestLocationReferenceType(str, Enum):
    """Allowed reference types for ServiceRequest.locationReference[]."""

    Location = "Location"


class ServiceRequestSpecimenReferenceType(str, Enum):
    """Allowed reference types for ServiceRequest.specimen[]."""

    Specimen = "Specimen"


class ServiceRequestRelevantHistoryReferenceType(str, Enum):
    """Allowed reference types for ServiceRequest.relevantHistory[]."""

    Provenance = "Provenance"


class ServiceRequestNoteAuthorReferenceType(str, Enum):
    """Allowed reference types for ServiceRequest.note[].author (Annotation.authorReference)."""

    Practitioner = "Practitioner"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"
