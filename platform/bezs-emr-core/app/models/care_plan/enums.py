from enum import Enum


class CarePlanStatus(str, Enum):
    draft = "draft"
    active = "active"
    on_hold = "on-hold"
    revoked = "revoked"
    completed = "completed"
    entered_in_error = "entered-in-error"
    unknown = "unknown"


class CarePlanIntent(str, Enum):
    proposal = "proposal"
    plan = "plan"
    order = "order"
    option = "option"


class CarePlanSubjectReferenceType(str, Enum):
    Patient = "Patient"
    Group = "Group"


class CarePlanAuthorReferenceType(str, Enum):
    Patient = "Patient"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Device = "Device"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"
    CareTeam = "CareTeam"


class CarePlanContributorReferenceType(str, Enum):
    Patient = "Patient"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Device = "Device"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"
    CareTeam = "CareTeam"


class CarePlanBasedOnReferenceType(str, Enum):
    CarePlan = "CarePlan"


class CarePlanReplacesReferenceType(str, Enum):
    CarePlan = "CarePlan"


class CarePlanPartOfReferenceType(str, Enum):
    CarePlan = "CarePlan"


class CarePlanCareTeamReferenceType(str, Enum):
    CareTeam = "CareTeam"


class CarePlanAddressesReferenceType(str, Enum):
    Condition = "Condition"


class CarePlanGoalReferenceType(str, Enum):
    Goal = "Goal"


class CarePlanActivityReferenceType(str, Enum):
    Appointment = "Appointment"
    CommunicationRequest = "CommunicationRequest"
    DeviceRequest = "DeviceRequest"
    MedicationRequest = "MedicationRequest"
    NutritionOrder = "NutritionOrder"
    Task = "Task"
    ServiceRequest = "ServiceRequest"
    VisionPrescription = "VisionPrescription"
    RequestGroup = "RequestGroup"


class CarePlanDetailActivityStatus(str, Enum):
    not_started = "not-started"
    scheduled = "scheduled"
    in_progress = "in-progress"
    on_hold = "on-hold"
    completed = "completed"
    cancelled = "cancelled"
    stopped = "stopped"
    unknown = "unknown"
    entered_in_error = "entered-in-error"


class CarePlanDetailLocationReferenceType(str, Enum):
    Location = "Location"


class CarePlanDetailPerformerReferenceType(str, Enum):
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    RelatedPerson = "RelatedPerson"
    Patient = "Patient"
    CareTeam = "CareTeam"
    HealthcareService = "HealthcareService"
    Device = "Device"


class CarePlanDetailReasonReferenceType(str, Enum):
    Condition = "Condition"
    Observation = "Observation"
    DiagnosticReport = "DiagnosticReport"
    DocumentReference = "DocumentReference"


class CarePlanDetailGoalReferenceType(str, Enum):
    Goal = "Goal"


class CarePlanDetailProductReferenceType(str, Enum):
    Medication = "Medication"
    Substance = "Substance"
