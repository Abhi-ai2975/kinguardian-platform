import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import SQLAlchemyFamilyRepository
from app.domains.family.schemas import AdherenceEventResponse
from app.domains.clinical.services import ClinicalService

router = APIRouter(prefix="/medications", tags=["Medications"])


@router.post("/{medication_id}/take", response_model=AdherenceEventResponse)
async def take_medication(
    medication_id: str,
    subject_id: Optional[uuid.UUID] = Query(None),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Records that a medication has been taken.
    """
    service = ClinicalService(db_session)
    if not subject_id:
        family_repo = SQLAlchemyFamilyRepository(db_session)
        subjects = await family_repo.list_care_subjects_by_profile(current_user.id)
        if not subjects:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="subject_id is required.")
        subject_id = subjects[0].id

    return await service.record_medication_taken(
        subject_id=subject_id,
        medication_id=medication_id,
        requester_id=current_user.id
    )
