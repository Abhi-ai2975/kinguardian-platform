from enum import Enum


class TaskStatus(str, Enum):
    draft = "draft"
    requested = "requested"
    received = "received"
    accepted = "accepted"
    rejected = "rejected"
    ready = "ready"
    cancelled = "cancelled"
    in_progress = "in-progress"
    on_hold = "on-hold"
    failed = "failed"
    completed = "completed"
    entered_in_error = "entered-in-error"


class TaskIntent(str, Enum):
    unknown = "unknown"
    proposal = "proposal"
    plan = "plan"
    order = "order"
    original_order = "original-order"
    reflex_order = "reflex-order"
    filler_order = "filler-order"
    instance_order = "instance-order"
    option = "option"


class TaskPriority(str, Enum):
    routine = "routine"
    urgent = "urgent"
    asap = "asap"
    stat = "stat"


class TaskRequesterReferenceType(str, Enum):
    Device = "Device"
    Organization = "Organization"
    Patient = "Patient"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    RelatedPerson = "RelatedPerson"


class TaskOwnerReferenceType(str, Enum):
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    CareTeam = "CareTeam"
    HealthcareService = "HealthcareService"
    Patient = "Patient"
    Device = "Device"
    RelatedPerson = "RelatedPerson"


class TaskLocationReferenceType(str, Enum):
    Location = "Location"


class TaskInsuranceReferenceType(str, Enum):
    Coverage = "Coverage"
    ClaimResponse = "ClaimResponse"


class TaskRelevantHistoryReferenceType(str, Enum):
    Provenance = "Provenance"


class TaskPartOfReferenceType(str, Enum):
    Task = "Task"


class TaskRestrictionRecipientReferenceType(str, Enum):
    Patient = "Patient"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    RelatedPerson = "RelatedPerson"
    Group = "Group"
    Organization = "Organization"
