"""
MockNotificationProvider - Development & Testing Adapter Fallback for Notification Delivery.
Simulates multi-channel notification dispatch (In-App, Push, SMS, WhatsApp, Email)
with in-memory delivery audit records for verification and debugging.
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.domains.notifications.providers import (
    NotificationProvider,
    NotificationDeliveryRequest,
    NotificationDeliveryResult
)


class MockNotificationProvider(NotificationProvider):
    """
    In-memory Mock Notification Provider for all channels.
    Allows local development and end-to-end alerting tests
    without requiring third-party cloud notification credentials (FCM, Twilio, SendGrid).
    """

    def __init__(self, channel: str = "in_app", provider_name: str = "mock_provider"):
        self.channel = channel
        self.provider_name = provider_name
        self.sent_deliveries: List[NotificationDeliveryRequest] = []
        self.fail_mode: bool = False

    async def send(self, request: NotificationDeliveryRequest) -> NotificationDeliveryResult:
        """Simulates immediate delivery recording the event in-memory."""
        self.sent_deliveries.append(request)

        if self.fail_mode:
            return NotificationDeliveryResult(
                channel=self.channel,
                provider=self.provider_name,
                success=False,
                error="Simulated mock delivery failure"
            )

        provider_msg_id = f"mock-msg-{uuid.uuid4()}"
        return NotificationDeliveryResult(
            channel=self.channel,
            provider=self.provider_name,
            success=True,
            provider_message_id=provider_msg_id,
            delivered_at=datetime.now(timezone.utc)
        )

    def get_sent_count(self) -> int:
        return len(self.sent_deliveries)

    def clear(self):
        self.sent_deliveries.clear()
