"""
Infrastructure Notifications Gateway:
Notification providers, FCM, Twilio, SendGrid, and WhatsApp Cloud adapters.
"""

from app.domains.notifications.policy import NotificationPolicy
from app.domains.notifications.rules import NotificationPolicyEngine
from app.domains.notifications.providers import (
    NotificationProvider,
    InAppNotificationProvider,
    PushNotificationProvider,
    SMSProvider,
    WhatsAppProvider,
    EmailProvider
)

__all__ = [
    "NotificationPolicy",
    "NotificationPolicyEngine",
    "NotificationProvider",
    "InAppNotificationProvider",
    "PushNotificationProvider",
    "SMSProvider",
    "WhatsAppProvider",
    "EmailProvider"
]
