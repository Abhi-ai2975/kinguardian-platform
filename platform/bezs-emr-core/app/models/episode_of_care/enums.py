from enum import Enum


class EpisodeOfCareStatus(str, Enum):
    planned = "planned"
    waitlist = "waitlist"
    active = "active"
    onhold = "onhold"
    finished = "finished"
    cancelled = "cancelled"
    entered_in_error = "entered-in-error"


class EpisodeOfCarePatientReferenceType(str, Enum):
    """Allowed reference type for EpisodeOfCare.patient."""

    Patient = "Patient"


class EpisodeOfCareCareManagerReferenceType(str, Enum):
    """Allowed reference types for EpisodeOfCare.careManager."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"


class EpisodeOfCareDiagnosisReferenceType(str, Enum):
    """Allowed reference type for EpisodeOfCare.diagnosis.condition."""

    Condition = "Condition"


class EpisodeOfCareReferralRequestReferenceType(str, Enum):
    """Allowed reference type for EpisodeOfCare.referralRequest."""

    ServiceRequest = "ServiceRequest"


class EpisodeOfCareTeamReferenceType(str, Enum):
    """Allowed reference type for EpisodeOfCare.team."""

    CareTeam = "CareTeam"


class EpisodeOfCareAccountReferenceType(str, Enum):
    """Allowed reference type for EpisodeOfCare.account."""

    Account = "Account"
