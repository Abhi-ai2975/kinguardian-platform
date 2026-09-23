from enum import Enum


class DeviceRequestStatus(str, Enum):
    """FHIR R4 RequestStatus value set (used by DeviceRequest.status)."""

    draft = "draft"
    active = "active"
    on_hold = "on-hold"
    revoked = "revoked"
    completed = "completed"
    entered_in_error = "entered-in-error"
    unknown = "unknown"


class DeviceRequestIntent(str, Enum):
    """FHIR R4 RequestIntent value set (used by DeviceRequest.intent)."""

    proposal = "proposal"
    plan = "plan"
    directive = "directive"
    order = "order"
    original_order = "original-order"
    reflex_order = "reflex-order"
    filler_order = "filler-order"
    instance_order = "instance-order"
    option = "option"


class DeviceRequestPriority(str, Enum):
    """FHIR R4 RequestPriority value set."""

    routine = "routine"
    urgent = "urgent"
    asap = "asap"
    stat = "stat"


class DeviceRequestSubjectType(str, Enum):
    """Allowed subject reference types for DeviceRequest.subject."""

    Patient = "Patient"
    Group = "Group"
    Location = "Location"
    Device = "Device"


class DeviceRequestRequesterType(str, Enum):
    """Allowed reference types for DeviceRequest.requester."""

    Device = "Device"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"


class DeviceRequestPerformerReferenceType(str, Enum):
    """Allowed reference types for DeviceRequest.performer."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    CareTeam = "CareTeam"
    HealthcareService = "HealthcareService"
    Patient = "Patient"
    Device = "Device"
    RelatedPerson = "RelatedPerson"


class DeviceRequestCodeReferenceType(str, Enum):
    """Allowed reference types for DeviceRequest.codeReference."""

    Device = "Device"


class DeviceRequestReasonReferenceType(str, Enum):
    """Allowed reference types for DeviceRequest.reasonReference[]."""

    Condition = "Condition"
    Observation = "Observation"
    DiagnosticReport = "DiagnosticReport"
    DocumentReference = "DocumentReference"


class DeviceRequestInsuranceReferenceType(str, Enum):
    """Allowed reference types for DeviceRequest.insurance[]."""

    Coverage = "Coverage"
    ClaimResponse = "ClaimResponse"


class DeviceRequestNoteAuthorReferenceType(str, Enum):
    """Allowed reference types for DeviceRequest.note[].author (Annotation.authorReference)."""

    Practitioner = "Practitioner"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"


class DeviceRequestRelevantHistoryReferenceType(str, Enum):
    """Allowed reference types for DeviceRequest.relevantHistory[]."""

    Provenance = "Provenance"
