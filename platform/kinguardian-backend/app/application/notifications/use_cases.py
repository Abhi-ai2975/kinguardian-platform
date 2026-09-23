"""
Notifications Application Use Cases:
- SendNotificationUseCase
"""

import uuid
from typing import Optional, Dict, Any
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.entities import NotificationEntity


class SendNotificationUseCase:
    """Dispatches a prioritized notification through appropriate user channels."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        recipient_profile_id: uuid.UUID,
        type: str,
        title: str,
        body: str,
        priority: str = "normal",
        subject_id: Optional[uuid.UUID] = None,
        action_type: Optional[str] = None,
        action_payload: Optional[Dict[str, Any]] = None
    ) -> NotificationEntity:
        return await self.family_service.add_notification(
            requester_id=requester_id,
            family_id=family_id,
            recipient_profile_id=recipient_profile_id,
            type=type,
            priority=priority,
            title=title,
            body=body,
            subject_id=subject_id,
            action_type=action_type,
            action_payload=action_payload
        )
