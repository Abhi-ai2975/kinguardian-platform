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
from app.domains.family.schemas import AIInsightResponse
from app.domains.family.domain.exceptions import FamilyAccessError

router = APIRouter(prefix="/insights", tags=["Insights"])


def get_family_service(session: AsyncSession) -> FamilyService:
    user_repo = SQLAlchemyAppProfileRepository(session)
    circle_repo = SQLAlchemyFamilyRepository(session)
    consent_repo = SQLAlchemyConsentRepository(session)
    event_logger = EventService(session)
    return FamilyService(user_repo, circle_repo, consent_repo, event_logger)


@router.get("/{id}", response_model=AIInsightResponse)
async def get_insight_detail(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves the full details and provenance sources of an AI Health Insight by ID.
    """
    service = get_family_service(db_session)
    try:
        return await service.get_insight_by_id(
            requester_id=current_user.id,
            insight_id=id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
