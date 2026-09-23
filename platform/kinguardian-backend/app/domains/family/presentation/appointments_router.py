import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.clinical.services import ClinicalService
from app.domains.clinical.schemas import AppointmentDetailResponse

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("/{id}", response_model=AppointmentDetailResponse)
async def get_appointment_detail(
    id: str,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves appointment details and coordination metadata by ID (coordination UUID or FHIR appointment ID).
    """
    service = ClinicalService(db_session)
    return await service.get_appointment_detail(
        appointment_id_str=id,
        requester_id=current_user.id
    )


@router.post("/{id}/prepare", response_model=AppointmentDetailResponse)
async def prepare_appointment(
    id: str,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Prepares for an upcoming clinical consultation (updates preparation checklist and readiness status).
    """
    service = ClinicalService(db_session)
    return await service.prepare_appointment(
        appointment_id_str=id,
        requester_id=current_user.id
    )


@router.post("/{id}/share-summary", response_model=AppointmentDetailResponse)
async def share_appointment_summary(
    id: str,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Shares post-consultation appointment summary with family members and caregivers.
    """
    service = ClinicalService(db_session)
    return await service.share_appointment_summary(
        appointment_id_str=id,
        requester_id=current_user.id
    )
