import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.family.domain.interfaces import IFamilyRepository, IAppProfileRepository, IEventLogger
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository
)
from app.domains.events.services import EventService
from app.domains.family.domain.entities import NotificationEntity, NotificationDeliveryEntity
from app.domains.notifications.providers import (
    NotificationProvider,
    NotificationDeliveryRequest,
    NotificationDeliveryResult,
    InAppNotificationProvider,
    PushNotificationProvider,
    SMSProvider,
    WhatsAppProvider,
    EmailProvider
)
from app.domains.notifications.policy import NotificationPolicy

from app.domains.notifications.rules import (
    NotificationPolicyEngine,
    NotificationIntent,
    BaseNotificationRule
)

logger = get_logger(__name__)


class NotificationService:
    """
    Notification Service:
    Coordinates multi-channel notification dispatch, policy enforcement (quiet hours, priority routing),
    provider adapter delivery, and delivery auditing.
    """

    def __init__(
        self,
        family_repo: IFamilyRepository,
        profile_repo: IAppProfileRepository,
        event_logger: IEventLogger,
        providers: Optional[Dict[str, NotificationProvider]] = None,
        policy_engine: Optional[NotificationPolicyEngine] = None
    ):
        self.family_repo = family_repo
        self.profile_repo = profile_repo
        self.event_logger = event_logger
        self.policy_engine = policy_engine or NotificationPolicyEngine(
            family_repo=family_repo,
            profile_repo=profile_repo
        )

        # Register default providers
        self._providers: Dict[str, NotificationProvider] = providers or {
            "in_app": InAppNotificationProvider(),
            "push": PushNotificationProvider(),
            "sms": SMSProvider(),
            "whatsapp": WhatsAppProvider(),
            "email": EmailProvider()
        }

    def register_provider(self, channel: str, provider: NotificationProvider) -> None:
        """Dynamically registers or overrides a channel provider adapter."""
        self._providers[channel] = provider

    def register_policy_rule(self, rule: BaseNotificationRule) -> None:
        """Dynamically registers a new declarative notification policy rule."""
        self.policy_engine.register_rule(rule)

    async def process_domain_event(
        self,
        event_type: str,
        family_id: uuid.UUID,
        payload: Dict[str, Any],
        subject_id: Optional[uuid.UUID] = None
    ) -> List[NotificationEntity]:
        """
        Evaluates declarative policy rules for a domain event and dispatches notifications
        in coordinated order (e.g. parent first, coordinator second) without hardcoding in controllers.
        """
        intents = await self.policy_engine.evaluate_event(
            event_type=event_type,
            family_id=family_id,
            payload=payload,
            subject_id=subject_id
        )

        dispatched_notifications: List[NotificationEntity] = []
        for intent in intents:
            notif = await self.send_notification(
                recipient_profile_id=intent.recipient_profile_id,
                family_id=intent.family_id,
                title=intent.title,
                body=intent.body,
                type=intent.type,
                priority=intent.priority,
                subject_id=intent.subject_id,
                action_type=intent.action_type,
                action_payload=intent.action_payload
            )
            dispatched_notifications.append(notif)

        return dispatched_notifications


    async def send_notification(
        self,
        recipient_profile_id: uuid.UUID,
        family_id: uuid.UUID,
        title: str,
        body: str,
        type: str = "general",
        priority: str = "normal",
        subject_id: Optional[uuid.UUID] = None,
        action_type: Optional[str] = None,
        action_payload: Optional[Dict[str, Any]] = None,
        source_event_id: Optional[uuid.UUID] = None,
        user_channel_preferences: Optional[Dict[str, bool]] = None
    ) -> NotificationEntity:
        """
        Creates notification record, determines delivery channels via NotificationPolicy,
        and dispatches across matching provider adapters.
        """
        recipient = await self.profile_repo.get_by_id(recipient_profile_id)
        recipient_tz = recipient.timezone if recipient else None
        recipient_email = recipient.email if recipient else None

        # 1. Create Core Notification Entity
        notification = await self.family_repo.add_notification(
            recipient_profile_id=recipient_profile_id,
            family_id=family_id,
            type=type,
            priority=priority,
            title=title,
            body=body,
            subject_id=subject_id,
            action_type=action_type,
            action_payload=action_payload,
            source_event_id=source_event_id
        )


        # 2. Determine target channels based on policy & quiet hours
        channels = NotificationPolicy.resolve_delivery_channels(
            priority=priority,
            recipient_timezone=recipient_tz,
            user_channel_preferences=user_channel_preferences
        )

        delivery_req = NotificationDeliveryRequest(
            notification_id=notification.id,
            recipient_profile_id=recipient_profile_id,
            recipient_email=recipient_email,
            title=title,
            body=body,
            priority=priority,
            action_type=action_type,
            action_payload=action_payload or {}
        )

        # 3. Dispatch to each resolved provider
        for ch in channels:
            provider = self._providers.get(ch)
            if not provider:
                logger.warning(f"No provider registered for channel '{ch}'. Skipping delivery.")
                continue

            try:
                res: NotificationDeliveryResult = await provider.send(delivery_req)
                status = "delivered" if res.success else "failed"
                delivery = await self.family_repo.add_notification_delivery(
                    notification_id=notification.id,
                    channel=ch,
                    provider=res.provider,
                    status=status,
                    provider_message_id=res.provider_message_id
                )
                if res.success:
                    await self.family_repo.update_notification_delivery(
                        delivery_id=delivery.id,
                        status="delivered",
                        delivered_at=res.delivered_at or datetime.now()
                    )
                else:
                    await self.family_repo.update_notification_delivery(
                        delivery_id=delivery.id,
                        status="failed",
                        failed_at=datetime.now(),
                        failure_reason=res.error
                    )
            except Exception as e:
                logger.error(f"Error delivering notification via {ch}: {e}", exc_info=True)
                delivery = await self.family_repo.add_notification_delivery(
                    notification_id=notification.id,
                    channel=ch,
                    provider=provider.provider_name,
                    status="failed"
                )
                await self.family_repo.update_notification_delivery(
                    delivery_id=delivery.id,
                    status="failed",
                    failed_at=datetime.now(),
                    failure_reason=str(e)
                )


        # 4. Audit domain event
        await self.event_logger.log_event(
            care_circle_id=family_id,
            event_type="notification_dispatched",
            payload={
                "channels": channels,
                "priority": priority,
                "title": title
            },
            aggregate_type="notification",
            aggregate_id=str(notification.id),
            actor_profile_id=recipient_profile_id
        )


        return notification

    async def list_notifications(
        self,
        recipient_profile_id: uuid.UUID,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[NotificationEntity]:
        """Lists in-app notifications for the recipient."""
        return await self.family_repo.list_notifications(
            recipient_profile_id=recipient_profile_id,
            unread_only=unread_only,
            limit=limit
        )

    async def mark_as_read(self, notification_id: uuid.UUID, recipient_profile_id: uuid.UUID) -> Optional[NotificationEntity]:
        """Marks an in-app notification as read."""
        notif = await self.family_repo.get_notification(notification_id)
        if not notif or notif.recipient_profile_id != recipient_profile_id:
            return None
        return await self.family_repo.update_notification_read(notification_id, datetime.now())

    async def dismiss(self, notification_id: uuid.UUID, recipient_profile_id: uuid.UUID) -> Optional[NotificationEntity]:
        """Dismisses an in-app notification."""
        notif = await self.family_repo.get_notification(notification_id)
        if not notif or notif.recipient_profile_id != recipient_profile_id:
            return None
        return await self.family_repo.update_notification_dismissed(notification_id, datetime.now())

    async def dismiss_notification(self, notification_id: uuid.UUID, recipient_profile_id: uuid.UUID) -> Optional[NotificationEntity]:
        """Alias for dismiss."""
        return await self.dismiss(notification_id, recipient_profile_id)

    async def get_deliveries(self, notification_id: uuid.UUID) -> List[NotificationDeliveryEntity]:
        """Retrieves delivery records for a specific notification."""
        return await self.family_repo.list_notification_deliveries(notification_id)

