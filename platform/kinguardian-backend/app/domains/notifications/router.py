import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository
)
from app.domains.events.services import EventService
from app.domains.notifications.services import NotificationService
from app.domains.family.schemas import NotificationResponse, NotificationDeliveryResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_notification_service(session: AsyncSession) -> NotificationService:
    return NotificationService(
        family_repo=SQLAlchemyFamilyRepository(session),
        profile_repo=SQLAlchemyAppProfileRepository(session),
        event_logger=EventService(session)
    )


class SendNotificationRequest(BaseModel):
    recipient_profile_id: uuid.UUID
    family_id: uuid.UUID
    title: str
    body: str
    type: str = "general"
    priority: str = "normal"  # critical | high | normal | low
    subject_id: Optional[uuid.UUID] = None
    action_type: Optional[str] = None
    action_payload: Dict[str, Any] = Field(default_factory=dict)


@router.get("", response_model=List[NotificationResponse])
async def list_user_notifications(
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=100),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists notifications for the authenticated user.
    """
    service = get_notification_service(db_session)
    return await service.list_notifications(
        recipient_profile_id=current_user.id,
        unread_only=unread_only,
        limit=limit
    )


@router.post("/send", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def send_notification(
    payload: SendNotificationRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Dispatches a notification across channels according to NotificationPolicy.
    """
    service = get_notification_service(db_session)
    return await service.send_notification(
        recipient_profile_id=payload.recipient_profile_id,
        family_id=payload.family_id,
        title=payload.title,
        body=payload.body,
        type=payload.type,
        priority=payload.priority,
        subject_id=payload.subject_id,
        action_type=payload.action_type,
        action_payload=payload.action_payload
    )


@router.patch("/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Marks a notification as read.
    """
    service = get_notification_service(db_session)
    notif = await service.mark_as_read(id, current_user.id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    return notif


@router.patch("/{id}/dismiss", response_model=NotificationResponse)
async def dismiss_notification(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Dismisses a notification.
    """
    service = get_notification_service(db_session)
    notif = await service.dismiss(id, current_user.id)
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    return notif


@router.get("/{id}/deliveries", response_model=List[NotificationDeliveryResponse])
async def list_notification_deliveries(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves delivery audit logs for a notification.
    """
    repo = SQLAlchemyFamilyRepository(db_session)
    notif = await repo.get_notification(id)
    if not notif or notif.recipient_profile_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
    return await repo.list_notification_deliveries(id)
