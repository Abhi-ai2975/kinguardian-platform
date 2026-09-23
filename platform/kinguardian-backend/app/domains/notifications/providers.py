import abc
import uuid
from typing import Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.domains.family.domain.entities import NotificationEntity, NotificationDeliveryEntity

logger = get_logger(__name__)


# ==========================================
# Delivery Context & Result
# ==========================================

class NotificationDeliveryRequest(BaseModel):
    notification_id: uuid.UUID
    recipient_profile_id: uuid.UUID
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    title: str
    body: str
    priority: str = "normal"  # critical | high | normal | low
    action_type: Optional[str] = None
    action_payload: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NotificationDeliveryResult(BaseModel):
    channel: str
    provider: str
    success: bool
    provider_message_id: Optional[str] = None
    delivered_at: Optional[datetime] = None
    error: Optional[str] = None


# ==========================================
# Base Notification Provider Interface
# ==========================================

class NotificationProvider(abc.ABC):
    """
    Abstract adapter for notification delivery channels (In-App, Push, SMS, WhatsApp, Email).
    Designed to allow easy swapping of real cloud providers (FCM, Twilio, SendGrid, Meta WhatsApp).
    """
    channel: str
    provider_name: str

    @abc.abstractmethod
    async def send(self, request: NotificationDeliveryRequest) -> NotificationDeliveryResult:
        """Sends the notification payload through this specific delivery channel."""
        pass


# ==========================================
# 1. In-App Notification Provider
# ==========================================

class InAppNotificationProvider(NotificationProvider):
    channel = "in_app"
    provider_name = "kinguardian_in_app"

    async def send(self, request: NotificationDeliveryRequest) -> NotificationDeliveryResult:
        """
        Delivers an in-app notification to the recipient's notification inbox.
        """
        logger.info(
            f"InAppNotificationProvider: Notification {request.notification_id} dispatched for "
            f"recipient {request.recipient_profile_id}. Title: '{request.title}'"
        )
        return NotificationDeliveryResult(
            channel=self.channel,
            provider=self.provider_name,
            success=True,
            provider_message_id=f"inapp_{uuid.uuid4().hex[:12]}",
            delivered_at=datetime.now()
        )


# ==========================================
# 2. Push Notification Provider (Mock / FCM)
# ==========================================

class PushNotificationProvider(NotificationProvider):
    channel = "push"
    provider_name = "mock_fcm_push"

    def __init__(self, fcm_server_key: Optional[str] = None):
        self.fcm_server_key = fcm_server_key

    async def send(self, request: NotificationDeliveryRequest) -> NotificationDeliveryResult:
        """
        Dispatches mobile push notification (FCM / APNs).
        Currently runs in high-fidelity mock mode with simulated message IDs.
        """
        logger.info(
            f"PushNotificationProvider: Push notification sent to recipient {request.recipient_profile_id}. "
            f"Title: '{request.title}', Priority: {request.priority}"
        )
        return NotificationDeliveryResult(
            channel=self.channel,
            provider=self.provider_name,
            success=True,
            provider_message_id=f"fcm_{uuid.uuid4().hex[:16]}",
            delivered_at=datetime.now()
        )


# ==========================================
# 3. SMS Notification Provider (Adapter)
# ==========================================

class SMSProvider(NotificationProvider):
    channel = "sms"
    provider_name = "twilio_sms_adapter"

    def __init__(self, account_sid: Optional[str] = None, auth_token: Optional[str] = None, from_number: Optional[str] = None):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number

    async def send(self, request: NotificationDeliveryRequest) -> NotificationDeliveryResult:
        """
        SMS delivery adapter (Twilio / AWS SNS ready).
        """
        if not request.recipient_phone:
            logger.warning(f"SMSProvider: Recipient {request.recipient_profile_id} has no phone number.")
            return NotificationDeliveryResult(
                channel=self.channel,
                provider=self.provider_name,
                success=False,
                error="Recipient phone number missing."
            )

        logger.info(f"SMSProvider: Sending SMS to {request.recipient_phone}: '{request.title}'")
        return NotificationDeliveryResult(
            channel=self.channel,
            provider=self.provider_name,
            success=True,
            provider_message_id=f"sms_{uuid.uuid4().hex[:14]}",
            delivered_at=datetime.now()
        )


# ==========================================
# 4. WhatsApp Notification Provider (Adapter)
# ==========================================

class WhatsAppProvider(NotificationProvider):
    channel = "whatsapp"
    provider_name = "whatsapp_cloud_adapter"

    def __init__(self, api_token: Optional[str] = None, phone_number_id: Optional[str] = None):
        self.api_token = api_token
        self.phone_number_id = phone_number_id

    async def send(self, request: NotificationDeliveryRequest) -> NotificationDeliveryResult:
        """
        WhatsApp Business Cloud API delivery adapter.
        """
        if not request.recipient_phone:
            return NotificationDeliveryResult(
                channel=self.channel,
                provider=self.provider_name,
                success=False,
                error="Recipient phone number missing for WhatsApp delivery."
            )

        logger.info(f"WhatsAppProvider: Sending WhatsApp message to {request.recipient_phone}: '{request.title}'")
        return NotificationDeliveryResult(
            channel=self.channel,
            provider=self.provider_name,
            success=True,
            provider_message_id=f"wamid_{uuid.uuid4().hex[:18]}",
            delivered_at=datetime.now()
        )


# ==========================================
# 5. Email Notification Provider (Adapter)
# ==========================================

class EmailProvider(NotificationProvider):
    channel = "email"
    provider_name = "sendgrid_email_adapter"

    def __init__(self, api_key: Optional[str] = None, from_email: str = "notifications@kinguardian.com"):
        self.api_key = api_key
        self.from_email = from_email

    async def send(self, request: NotificationDeliveryRequest) -> NotificationDeliveryResult:
        """
        Email delivery adapter (SendGrid / AWS SES / SMTP ready).
        """
        if not request.recipient_email:
            return NotificationDeliveryResult(
                channel=self.channel,
                provider=self.provider_name,
                success=False,
                error="Recipient email address missing."
            )

        logger.info(f"EmailProvider: Sending Email to {request.recipient_email}: '{request.title}'")
        return NotificationDeliveryResult(
            channel=self.channel,
            provider=self.provider_name,
            success=True,
            provider_message_id=f"msgid_{uuid.uuid4().hex[:16]}@kinguardian.com",
            delivered_at=datetime.now()
        )


