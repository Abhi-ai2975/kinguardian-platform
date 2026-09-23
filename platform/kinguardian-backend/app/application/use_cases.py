"""
KinGuardian Centralized Application Use Cases Registry:
All controller endpoints invoke explicit Use Cases rather than calling repositories directly.
"""

from app.application.family.use_cases import (
    CreateFamilyUseCase,
    AddFamilyMemberUseCase,
    CreateCareRelationshipUseCase,
    GetCoordinatorHomeUseCase,
    GetParentHomeUseCase
)
from app.application.consent.use_cases import (
    GrantConsentUseCase,
    RevokeConsentUseCase
)
from app.application.care.use_cases import (
    GetParentHealthSummaryUseCase,
    SubmitParentCheckInUseCase,
    CreateCareTaskUseCase,
    AssignCareTaskUseCase,
    CompleteCareTaskUseCase
)
from app.application.medication.use_cases import (
    ConfirmMedicationUseCase,
    SendMedicationReminderUseCase
)
from app.application.appointments.use_cases import (
    GetUpcomingAppointmentsUseCase,
    PrepareAppointmentUseCase
)
from app.application.documents.use_cases import (
    UploadHealthDocumentUseCase,
    ProcessHealthDocumentUseCase,
    ReviewDocumentExtractionUseCase
)
from app.application.ai.use_cases import (
    AskKinGuardianUseCase,
    GenerateHealthInsightUseCase,
    GenerateGuardianMomentUseCase
)
from app.application.communication.use_cases import (
    CreateFamilyMessageUseCase
)
from app.application.notifications.use_cases import (
    SendNotificationUseCase
)

__all__ = [
    # Family Use Cases
    "CreateFamilyUseCase",
    "AddFamilyMemberUseCase",
    "CreateCareRelationshipUseCase",
    "GetCoordinatorHomeUseCase",
    "GetParentHomeUseCase",

    # Consent Use Cases
    "GrantConsentUseCase",
    "RevokeConsentUseCase",

    # Care Use Cases
    "GetParentHealthSummaryUseCase",
    "SubmitParentCheckInUseCase",
    "CreateCareTaskUseCase",
    "AssignCareTaskUseCase",
    "CompleteCareTaskUseCase",

    # Medication Use Cases
    "ConfirmMedicationUseCase",
    "SendMedicationReminderUseCase",

    # Appointments Use Cases
    "GetUpcomingAppointmentsUseCase",
    "PrepareAppointmentUseCase",

    # Documents Use Cases
    "UploadHealthDocumentUseCase",
    "ProcessHealthDocumentUseCase",
    "ReviewDocumentExtractionUseCase",

    # AI Use Cases
    "AskKinGuardianUseCase",
    "GenerateHealthInsightUseCase",
    "GenerateGuardianMomentUseCase",

    # Communication Use Cases
    "CreateFamilyMessageUseCase",

    # Notifications Use Cases
    "SendNotificationUseCase"
]
