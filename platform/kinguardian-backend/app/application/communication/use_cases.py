"""
Communication Application Use Cases:
- CreateFamilyMessageUseCase
"""

import uuid
from typing import Optional
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.entities import FamilyMessageEntity


class CreateFamilyMessageUseCase:
    """Sends a message within a family circle conversation thread."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        sender_id: uuid.UUID,
        family_id: uuid.UUID,
        conversation_id: uuid.UUID,
        content: str,
        message_type: str = "text",
        attachment_file_id: Optional[uuid.UUID] = None,
        reply_to_message_id: Optional[uuid.UUID] = None
    ) -> FamilyMessageEntity:
        return await self.family_service.add_family_message(
            requester_id=sender_id,
            family_id=family_id,
            conversation_id=conversation_id,
            message_type=message_type,
            body=content,
            file_id=attachment_file_id,
            reply_to_message_id=reply_to_message_id
        )
