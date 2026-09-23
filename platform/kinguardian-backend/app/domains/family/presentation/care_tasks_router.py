import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.domains.family.schemas import (
    CareTaskCreate,
    CareTaskUpdate,
    CareTaskAssign,
    CareTaskResponse
)
from app.domains.family.domain.exceptions import FamilyAccessError

router = APIRouter(prefix="/care/tasks", tags=["Care Tasks"])


def get_family_service(session: AsyncSession) -> FamilyService:
    user_repo = SQLAlchemyAppProfileRepository(session)
    circle_repo = SQLAlchemyFamilyRepository(session)
    consent_repo = SQLAlchemyConsentRepository(session)
    event_logger = EventService(session)
    return FamilyService(user_repo, circle_repo, consent_repo, event_logger)


@router.post("", response_model=CareTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_care_task(
    payload: CareTaskCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Creates a new care task for a care subject.
    """
    service = get_family_service(db_session)
    family_id = payload.family_id
    if not family_id:
        subject = await service.circle_repo.get_care_subject(payload.subject_id)
        if not subject:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care subject not found.")
        family_id = subject.family_id

    try:
        from datetime import datetime, timezone, timedelta
        assigned_to = payload.assigned_to_profile_id or current_user.id
        due = payload.due_at or (datetime.now(timezone.utc) + timedelta(days=1))
        return await service.add_care_task(
            requester_id=current_user.id,
            family_id=family_id,
            subject_id=payload.subject_id,
            assigned_to_profile_id=assigned_to,
            title=payload.title,
            description=payload.description,
            category=payload.category,
            priority=payload.priority,
            due_at=due
        )

    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.patch("/{id}", response_model=CareTaskResponse)

async def patch_care_task(
    id: uuid.UUID,
    payload: CareTaskUpdate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Updates a care task (title, description, priority, category, due_at, status, assigned profile).
    """
    service = get_family_service(db_session)
    try:
        return await service.update_care_task_by_id(
            requester_id=current_user.id,
            task_id=id,
            title=payload.title,
            description=payload.description,
            category=payload.category,
            priority=payload.priority,
            due_at=payload.due_at,
            status=payload.status,
            assigned_to_profile_id=payload.assigned_to_profile_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{id}/complete", response_model=CareTaskResponse)
async def complete_care_task(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Marks a care task as completed by the authenticated user.
    """
    service = get_family_service(db_session)
    try:
        return await service.complete_care_task_by_id(
            requester_id=current_user.id,
            task_id=id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{id}/assign", response_model=CareTaskResponse)
async def assign_care_task(
    id: uuid.UUID,
    payload: CareTaskAssign,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Assigns a care task to another member of the family group.
    """
    service = get_family_service(db_session)
    try:
        return await service.assign_care_task(
            requester_id=current_user.id,
            task_id=id,
            assigned_to_profile_id=payload.assigned_to_profile_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
