import uuid
from typing import List, Optional
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
from app.domains.clinical.schemas import (
    VitalsSummaryResponse,
    MedicationSummaryResponse,
    AppointmentSummaryResponse
)
from app.domains.clinical.services import ClinicalService
from app.domains.clinical.gateway import FHIRClinicalRecordGateway
from app.domains.clinical.analytics import (
    HealthMetricSnapshot,
    MetricSeriesResponse,
    HealthAnalyticsService
)

router = APIRouter(prefix="/clinical", tags=["Clinical & Health Analytics"])


@router.get("/vitals/{parent_id}", response_model=VitalsSummaryResponse)
async def get_parent_vitals(
    parent_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = ClinicalService(db_session)
    return await service.get_patient_vitals(parent_id, current_user.id)


@router.get("/medications/{parent_id}", response_model=List[MedicationSummaryResponse])
async def get_parent_medications(
    parent_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = ClinicalService(db_session)
    return await service.get_patient_medications(parent_id, current_user.id)


@router.get("/appointments/{parent_id}", response_model=List[AppointmentSummaryResponse])
async def get_parent_appointments(
    parent_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = ClinicalService(db_session)
    return await service.get_patient_appointments(parent_id, current_user.id)


@router.get("/analytics/subjects/{subject_id}/snapshots", response_model=List[HealthMetricSnapshot])
async def get_subject_health_metric_snapshots(
    subject_id: uuid.UUID,
    metric: Optional[str] = Query(None, description="Optional metric filter e.g. blood_pressure_systolic, heart_rate, glucose"),
    timeframe_days: int = Query(30, ge=1, le=365),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    On-demand read/analytics layer: queries the authoritative FHIR source,
    normalizes observations, and calculates baseline values without redundant DB persistence.
    """
    family_repo = SQLAlchemyFamilyRepository(db_session)
    subject = await family_repo.get_care_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care subject not found")

    gateway = FHIRClinicalRecordGateway()
    analytics_svc = HealthAnalyticsService(gateway=gateway)

    return await analytics_svc.get_patient_metric_snapshots(
        fhir_patient_id=subject.fhir_patient_id,
        subject_id=subject.id,
        metric=metric,
        timeframe_days=timeframe_days
    )


@router.get("/analytics/subjects/{subject_id}/series/{metric}", response_model=MetricSeriesResponse)
async def get_subject_metric_series(
    subject_id: uuid.UUID,
    metric: str,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Returns time series with deterministic 7-day, 14-day, and 30-day statistical baselines.
    """
    family_repo = SQLAlchemyFamilyRepository(db_session)
    subject = await family_repo.get_care_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care subject not found")

    gateway = FHIRClinicalRecordGateway()
    analytics_svc = HealthAnalyticsService(gateway=gateway)

    return await analytics_svc.get_metric_series_with_baselines(
        fhir_patient_id=subject.fhir_patient_id,
        subject_id=subject.id,
        metric=metric
    )
