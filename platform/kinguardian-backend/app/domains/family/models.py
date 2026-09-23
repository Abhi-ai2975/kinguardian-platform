"""
Backward-compatibility model aliases.
Directs imports to app.domains.family.infrastructure.models.
"""
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    FamilyRelationship,
    CareRelationship,
    Consent,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    MonitoringPreference,
    AIInsight,
    AIInsightSource,
    Notification,
    NotificationDelivery,
    FamilyConversation,
    FamilyMessage,
    AppointmentCoordination,
    HealthDocument,
    DocumentExtraction,
    AIConversation,
    AIAction
)

# Aliases
User = AppProfile
CareCircle = Family
FamilyMember = FamilyMembership
CareCircleMember = FamilyMembership

