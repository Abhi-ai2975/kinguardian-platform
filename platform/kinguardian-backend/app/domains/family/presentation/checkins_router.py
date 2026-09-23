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
    WellbeingCheckinCreate,
    WellbeingCheckinResponse
)
from app.domains.family.domain.exceptions import FamilyAccessError

router = APIRouter(prefix="/check-ins", tags=["Wellbeing Check-ins"])


def get_family_service(session: AsyncSession) -> FamilyService:
    user_repo = SQLAlchemyAppProfileRepository(session)
    circle_repo = SQLAlchemyFamilyRepository(session)
    consent_repo = SQLAlchemyConsentRepository(session)
    event_logger = EventService(session)
    return FamilyService(user_repo, circle_repo, consent_repo, event_logger)


@router.post("", response_model=WellbeingCheckinResponse, status_code=status.HTTP_201_CREATED)
async def create_checkin(
    payload: WellbeingCheckinCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Submits a daily wellbeing check-in (feeling, notes, voice note, severity).
    """
    service = get_family_service(db_session)
    subject_id = payload.subject_id
    if not subject_id:
        subjects = await service.circle_repo.list_care_subjects_by_profile(current_user.id)
        if not subjects:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="subject_id is required.")
        subject_id = subjects[0].id

    try:
        return await service.submit_subject_checkin(
            requester_id=current_user.id,
            subject_id=subject_id,
            feeling=payload.feeling,
            notes=payload.notes,
            voice_file_id=payload.voice_file_id,
            severity=payload.severity
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
