"""
Family Messages & Conversations API:
Implements cursor-paginated endpoints for family messaging:
- GET /families/{family_id}/conversations
- GET /conversations/{id}/messages
- POST /conversations/{id}/messages
"""

import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.exceptions import FamilyAccessError
from app.domains.family.schemas import (
    FamilyConversationResponse,
    FamilyMessageCreate,
    FamilyMessageResponse
)
from app.domains.family.presentation.mobile_schemas import (
    CursorPaginatedResponse
)
from pydantic import BaseModel, Field

router = APIRouter(tags=["Family Messages"])


class FamilyConversationCursorResponse(BaseModel):
    items: List[FamilyConversationResponse] = Field(default_factory=list)
    next_cursor: Optional[str] = None


class FamilyMessageCursorResponse(BaseModel):
    items: List[FamilyMessageResponse] = Field(default_factory=list)
    next_cursor: Optional[str] = None


def get_family_service(session: AsyncSession) -> FamilyService:
    return FamilyService(
        user_repo=SQLAlchemyAppProfileRepository(session),
        circle_repo=SQLAlchemyFamilyRepository(session),
        consent_repo=SQLAlchemyConsentRepository(session),
        event_logger=EventService(session)
    )


@router.get("/families/{family_id}/conversations", response_model=FamilyConversationCursorResponse)
async def list_family_conversations_cursor(
    family_id: uuid.UUID,
    cursor: Optional[str] = Query(None, description="Opaque timestamp cursor for pagination"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists conversations within a family group using cursor pagination.
    """
    service = get_family_service(db_session)
    mem = await service.circle_repo.get_member(family_id, current_user.id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this family group.")

    convs = await service.circle_repo.list_conversations(family_id)

    # Sort DESC by updated_at
    convs.sort(key=lambda c: c.updated_at, reverse=True)

    # Filter with cursor
    if cursor:
        idx = next((i for i, c in enumerate(convs) if str(c.id) == cursor), None)
        if idx is not None:
            convs = convs[idx + 1:]
        else:
            try:
                cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
                if cursor_dt.tzinfo is None:
                    cursor_dt = cursor_dt.replace(tzinfo=timezone.utc)
                convs = [c for c in convs if (c.updated_at.replace(tzinfo=timezone.utc) if c.updated_at.tzinfo is None else c.updated_at) < cursor_dt]
            except ValueError:
                pass

    page_items = convs[:limit]
    next_cursor = None
    if len(convs) > limit and page_items:
        last_item = page_items[-1]
        next_cursor = str(last_item.id)

    items_dtos = [
        FamilyConversationResponse(
            id=c.id,
            family_id=c.family_id,
            subject_id=c.subject_id,
            created_at=c.created_at,
            updated_at=c.updated_at,
            messages=[
                FamilyMessageResponse(
                    id=m.id,
                    conversation_id=m.conversation_id,
                    sender_profile_id=m.sender_profile_id,
                    message_type=m.message_type,
                    body=m.body,
                    file_id=m.file_id,
                    reply_to_message_id=m.reply_to_message_id,
                    created_at=m.created_at
                ) for m in (c.messages or [])
            ]
        ) for c in page_items
    ]

    return FamilyConversationCursorResponse(
        items=items_dtos,
        next_cursor=next_cursor
    )


@router.get("/conversations/{id}/messages", response_model=FamilyMessageCursorResponse)
async def list_conversation_messages_cursor(
    id: uuid.UUID,
    cursor: Optional[str] = Query(None, description="Opaque timestamp cursor or message ID"),
    limit: int = Query(20, ge=1, le=100, description="Page limit"),
    direction: str = Query("before", description="Pagination direction: before | after"),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves messages for a conversation with cursor pagination.
    """
    service = get_family_service(db_session)
    conv = await service.circle_repo.get_conversation(id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    mem = await service.circle_repo.get_member(conv.family_id, current_user.id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to view messages in this conversation.")

    messages = await service.circle_repo.list_messages(id)

    # Sort messages DESC by created_at for chat timeline
    messages.sort(key=lambda m: m.created_at, reverse=True)

    # Cursor filter
    if cursor:
        idx = next((i for i, m in enumerate(messages) if str(m.id) == cursor), None)
        if idx is not None:
            messages = messages[idx + 1:]
        else:
            try:
                cursor_dt = datetime.fromisoformat(cursor.replace(" ", "+"))
                if cursor_dt.tzinfo is None:
                    cursor_dt = cursor_dt.replace(tzinfo=timezone.utc)
                messages = [m for m in messages if (m.created_at.replace(tzinfo=timezone.utc) if m.created_at.tzinfo is None else m.created_at) < cursor_dt]
            except ValueError:
                pass

    page_items = messages[:limit]
    next_cursor = None
    if len(messages) > limit and page_items:
        last_item = page_items[-1]
        next_cursor = str(last_item.id)


    items_dtos = [
        FamilyMessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            sender_profile_id=m.sender_profile_id,
            message_type=m.message_type,
            body=m.body,
            file_id=m.file_id,
            reply_to_message_id=m.reply_to_message_id,
            created_at=m.created_at
        ) for m in page_items
    ]

    return FamilyMessageCursorResponse(
        items=items_dtos,
        next_cursor=next_cursor
    )


@router.post("/conversations/{id}/messages", response_model=FamilyMessageResponse, status_code=status.HTTP_201_CREATED)
async def post_conversation_message(
    id: uuid.UUID,
    payload: FamilyMessageCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Posts a new message to the specified family conversation.
    """
    service = get_family_service(db_session)
    conv = await service.circle_repo.get_conversation(id)
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    mem = await service.circle_repo.get_member(conv.family_id, current_user.id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to post messages to this conversation.")

    try:
        return await service.add_family_message(
            requester_id=current_user.id,
            family_id=conv.family_id,
            conversation_id=id,
            message_type=payload.message_type,
            body=payload.body,
            file_id=payload.file_id,
            reply_to_message_id=payload.reply_to_message_id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
