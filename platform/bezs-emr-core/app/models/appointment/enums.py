from enum import Enum


class AppointmentStatus(str, Enum):
    proposed = "proposed"
    pending = "pending"
    booked = "booked"
    arrived = "arrived"
    fulfilled = "fulfilled"
    cancelled = "cancelled"
    noshow = "noshow"
    entered_in_error = "entered-in-error"
    checked_in = "checked-in"
    waitlist = "waitlist"


class AppointmentParticipantStatus(str, Enum):
    accepted = "accepted"
    declined = "declined"
    tentative = "tentative"
    needs_action = "needs-action"


class AppointmentParticipantActorType(str, Enum):
    Patient = "Patient"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    RelatedPerson = "RelatedPerson"
    Device = "Device"
    HealthcareService = "HealthcareService"
    Location = "Location"
    Group = "Group"
    CareTeam = "CareTeam"


class AppointmentReasonReferenceType(str, Enum):
    """Allowed reference types for Appointment.reason.reference (CodeableReference)."""

    Condition = "Condition"
    Procedure = "Procedure"
    Observation = "Observation"
    ImmunizationRecommendation = "ImmunizationRecommendation"
    DiagnosticReport = "DiagnosticReport"


class AppointmentNoteAuthorReferenceType(str, Enum):
    """Allowed reference types for Appointment.note.author[x] (Annotation.authorReference)."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"


class AppointmentPatientInstructionReferenceType(str, Enum):
    """Allowed reference types for Appointment.patientInstruction.reference (CodeableReference)."""

    DocumentReference = "DocumentReference"
    Binary = "Binary"
    Communication = "Communication"


class AppointmentReplacesReferenceType(str, Enum):
    """Allowed reference types for Appointment.replaces[]."""

    Appointment = "Appointment"


class AppointmentSlotReferenceType(str, Enum):
    """Allowed reference types for Appointment.slot[]."""

    Slot = "Slot"


class AppointmentAccountReferenceType(str, Enum):
    """Allowed reference types for Appointment.account[]."""

    Account = "Account"


class AppointmentServiceTypeReferenceType(str, Enum):
    """Allowed reference types for Appointment.serviceType.reference (CodeableReference)."""

    HealthcareService = "HealthcareService"


class AppointmentBasedOnReferenceType(str, Enum):
    """Allowed reference types for Appointment.basedOn (Reference)."""

    CarePlan = "CarePlan"
    DeviceRequest = "DeviceRequest"
    MedicationRequest = "MedicationRequest"
    ServiceRequest = "ServiceRequest"
    RequestOrchestration = "RequestOrchestration"
    NutritionOrder = "NutritionOrder"
    VisionPrescription = "VisionPrescription"
