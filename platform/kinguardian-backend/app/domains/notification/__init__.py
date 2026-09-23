"""
Notification Domain Module:
Bounded domain for Multi-Channel Notification Policies, Delivery Tracking, and Provider Gateways.
"""

from app.domains.notifications.policy import NotificationPolicy
from app.domains.notifications.rules import (
    NotificationPolicyEngine,
    BaseNotificationRule,
    NotificationIntent,
    NotificationRuleContext,
    ParentCheckinSubmittedRule,
    MedicationMissedRule,
    GuardianMomentCreatedRule,
    AppointmentTomorrowRule
)
from app.domains.notifications.providers import (
    NotificationProvider,
    InAppNotificationProvider,
    PushNotificationProvider,
    SMSProvider,
    WhatsAppProvider,
    EmailProvider
)
from app.core.adapters.mock_notifications import MockNotificationProvider
from app.domains.notifications.services import NotificationService
from app.domains.family.infrastructure.models import Notification, NotificationDelivery
from app.domains.family.domain.entities import NotificationEntity, NotificationDeliveryEntity
from app.domains.family.schemas import (
    NotificationCreate,
    NotificationResponse,
    NotificationDeliveryCreate,
    NotificationDeliveryUpdate,
    NotificationDeliveryResponse
)

__all__ = [
    "NotificationPolicy",
    "NotificationPolicyEngine",
    "BaseNotificationRule",
    "NotificationIntent",
    "NotificationRuleContext",
    "ParentCheckinSubmittedRule",
    "MedicationMissedRule",
    "GuardianMomentCreatedRule",
    "AppointmentTomorrowRule",
    "NotificationProvider",
    "InAppNotificationProvider",
    "PushNotificationProvider",
    "SMSProvider",
    "WhatsAppProvider",
    "EmailProvider",
    "MockNotificationProvider",
    "NotificationService",
    "Notification",
    "NotificationDelivery",
    "NotificationEntity",
    "NotificationDeliveryEntity",
    "NotificationCreate",
    "NotificationResponse",
    "NotificationDeliveryCreate",
    "NotificationDeliveryUpdate",
    "NotificationDeliveryResponse"
]
