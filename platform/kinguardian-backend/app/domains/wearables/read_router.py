"""
Wearable Read Presentation Router.

Provides direct care subject read endpoints for wearable health information:
- GET /subjects/{subject_id}/wearables
- GET /subjects/{subject_id}/wearables/connections
- GET /subjects/{subject_id}/wearables/summary
- GET /subjects/{subject_id}/wearables/activity (paginated)
- GET /subjects/{subject_id}/wearables/sleep (paginated)
- GET /subjects/{subject_id}/wearables/heart-rate (paginated)
"""

import math
import uuid
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import (
    AppProfile,
    FamilyMembership,
    CareSubject
)
from app.domains.wearables.gateway import WearableDataGateway
from app.domains.wearables.services import WearableService
from app.domains.wearables.schemas import (
    DeviceConnectionResponse,
    WearableActivitySummary,
    WearableSleepSummary,
    WearableRecoverySummary,
    WearableDashboardResponse,
    WearableSyncStatus,
    PaginationMetadata,
    PaginatedActivityResponse,
    PaginatedSleepResponse,
    PaginatedHeartRateResponse,
    WearableSubjectOverview,
    CreateWearableConnectionRequest,
    WearableConnectionFlowDescriptor,
    WearableDisconnectResponse,
    WearableMetricItem,
    UnifiedWearableMetricsResponse,
    WearableDerivedSummaryResponse,
    CareSubjectSyncStatusResponse
)







router = APIRouter(
    prefix="/subjects/{subject_id}/wearables",
    tags=["Wearables Read API"]
)


def get_wearable_gateway() -> WearableDataGateway:
    """Dependency provider for the external WearableDataGateway port."""
    from app.domains.wearables.gateway import HttpOpenWearablesGateway
    return HttpOpenWearablesGateway()



def get_wearable_service(
    db: AsyncSession = Depends(get_db),
    gateway: WearableDataGateway = Depends(get_wearable_gateway)
) -> WearableService:
    return WearableService(session=db, gateway=gateway)




@router.get(
    "",
    response_model=WearableSubjectOverview,
    summary="Get root wearable overview for care subject"
)
async def get_subject_wearables_overview(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the root wearable overview for a care subject, including active connections,
    latest daily vitals, and synchronization health.
    """
    await service.verify_subject_access(current_user.id, subject_id)
    wearable_user_id = service.get_wearable_user_id(subject_id)

    connections = await service.get_subject_connections(subject_id)
    sync_status = await service.get_sync_status(subject_id)

    # Fetch latest day metrics
    activities = await service.get_activity_history(subject_id, days=1)
    sleeps = await service.get_sleep_history(subject_id, days=1)
    heart_rates = await service.get_recovery_history(subject_id, days=1)

    return WearableSubjectOverview(
        subject_id=subject_id,
        open_wearables_user_id=wearable_user_id,
        active_connections=connections,
        latest_activity=activities[-1] if activities else None,
        latest_sleep=sleeps[-1] if sleeps else None,
        latest_heart_rate=heart_rates[-1] if heart_rates else None,
        sync_status=sync_status
    )


@router.post(
    "/connections",
    response_model=WearableConnectionFlowDescriptor,
    status_code=status.HTTP_201_CREATED,
    summary="Create wearable connection and get connection flow descriptor"
)
async def create_subject_wearable_connection(
    subject_id: uuid.UUID,
    payload: CreateWearableConnectionRequest,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Initiates a wearable device connection flow for a care subject.
    Returns a connection flow descriptor with the hosted authorization URL and zero vendor credentials.
    """
    await service.verify_subject_access(current_user.id, subject_id)
    try:
        return await service.create_connection_descriptor(
            subject_id=subject_id,
            provider=payload.provider,
            redirect_url=payload.redirect_url,
            profile_id=current_user.id
        )
    except ValueError as e:
        if "consent" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "/connections",
    response_model=List[DeviceConnectionResponse],
    summary="Get all connected and available wearable providers"
)

async def get_subject_wearable_connections(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns all active, pending, and historical wearable connections (Apple Watch, Garmin, Fitbit, Oura)
    associated with the care subject.
    """
    await service.verify_subject_access(current_user.id, subject_id)
    return await service.get_subject_connections(subject_id)


@router.get(
    "/summary",
    response_model=WearableDerivedSummaryResponse,
    summary="Get mobile-friendly derived wearable summary read model"
)
async def get_subject_wearable_summary(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns mobile-friendly derived summary information:
    - Activity: today, baseline, change_percent
    - Sleep: duration_minutes, baseline_minutes
    - Resting Heart Rate: value, baseline
    - Last sync timestamp
    """
    await service.verify_subject_access(current_user.id, subject_id)
    return await service.get_derived_summary(subject_id)


@router.get(
    "/sync-status",
    response_model=CareSubjectSyncStatusResponse,
    summary="Get granular 6-state sync status for care subject devices (role-aware: coordinator vs parent)"
)
async def get_subject_wearable_sync_status(
    subject_id: uuid.UUID,
    view_mode: Optional[str] = Query(default=None, description="Presentation mode: 'coordinator' or 'parent'"),
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Exposes canonical 6-state sync status:
    - Connected
    - Syncing
    - Up to date
    - Delayed
    - Error
    - Disconnected

    Examples:
    Coordinator View:
      Dad's Garmin
      ✓ Up to date
      Last sync: 8 minutes ago

    Parent View:
      My watch
      ✓ Connected
    """
    subject = await service.verify_subject_access(current_user.id, subject_id)
    # Default view mode: if caller is the care subject -> 'parent', else -> 'coordinator'

    effective_mode = view_mode or ("parent" if subject.profile_id == current_user.id else "coordinator")
    return await service.get_care_subject_sync_status(subject_id, view_mode=effective_mode)


@router.get(
    "/dashboard",
    response_model=WearableDashboardResponse,
    summary="Get aggregated wearable dashboard summary"
)
async def get_subject_wearable_dashboard(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the complete aggregated wearable dashboard summary with weekly averages,
    baseline goals, and anomaly detections.
    """
    await service.verify_subject_access(current_user.id, subject_id)
    return await service.get_wearable_dashboard(subject_id)




@router.get(
    "/activity",
    response_model=PaginatedActivityResponse,
    summary="Get paginated daily activity time-series data"
)
async def get_subject_activity_paginated(
    subject_id: uuid.UUID,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Number of daily items per page"),
    start_date: Optional[str] = Query(default=None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date filter (YYYY-MM-DD)"),
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns paginated daily activity time-series telemetry (steps, distance, active minutes, calories).
    """
    await service.verify_subject_access(current_user.id, subject_id)

    # Resolve date range
    if not end_date:
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")

    wearable_user_id = service.get_wearable_user_id(subject_id)
    all_activities = await service.gateway.get_daily_activity(wearable_user_id, start_date, end_date)

    # Sort descending by date (most recent first)
    sorted_items = sorted(all_activities, key=lambda x: x.date, reverse=True)

    total_items = len(sorted_items)
    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1
    offset = (page - 1) * page_size
    page_items = sorted_items[offset : offset + page_size]

    return PaginatedActivityResponse(
        items=page_items,
        pagination=PaginationMetadata(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1
        )
    )


@router.get(
    "/sleep",
    response_model=PaginatedSleepResponse,
    summary="Get paginated sleep architecture time-series data"
)
async def get_subject_sleep_paginated(
    subject_id: uuid.UUID,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Number of daily items per page"),
    start_date: Optional[str] = Query(default=None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date filter (YYYY-MM-DD)"),
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns paginated sleep architecture time-series telemetry (total sleep, stages, score).
    """
    await service.verify_subject_access(current_user.id, subject_id)

    if not end_date:
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")

    wearable_user_id = service.get_wearable_user_id(subject_id)
    all_sleeps = await service.gateway.get_sleep(wearable_user_id, start_date, end_date)

    sorted_items = sorted(all_sleeps, key=lambda x: x.date, reverse=True)

    total_items = len(sorted_items)
    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1
    offset = (page - 1) * page_size
    page_items = sorted_items[offset : offset + page_size]

    return PaginatedSleepResponse(
        items=page_items,
        pagination=PaginationMetadata(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1
        )
    )


@router.get(
    "/heart-rate",
    response_model=PaginatedHeartRateResponse,
    summary="Get paginated heart rate and recovery vitals time-series data"
)
async def get_subject_heart_rate_paginated(
    subject_id: uuid.UUID,
    page: int = Query(default=1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Number of daily items per page"),
    start_date: Optional[str] = Query(default=None, description="Start date filter (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(default=None, description="End date filter (YYYY-MM-DD)"),
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns paginated cardiovascular and recovery vitals time-series telemetry (RHR, HRV, SpO2).
    """
    await service.verify_subject_access(current_user.id, subject_id)

    if not end_date:
        end_date = datetime.utcnow().strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.utcnow() - timedelta(days=90)).strftime("%Y-%m-%d")

    wearable_user_id = service.get_wearable_user_id(subject_id)
    all_heart_rates = await service.gateway.get_heart_rate(wearable_user_id, start_date, end_date)

    sorted_items = sorted(all_heart_rates, key=lambda x: x.date, reverse=True)

    total_items = len(sorted_items)
    total_pages = math.ceil(total_items / page_size) if total_items > 0 else 1
    offset = (page - 1) * page_size
    page_items = sorted_items[offset : offset + page_size]

    return PaginatedHeartRateResponse(
        items=page_items,
        pagination=PaginationMetadata(
            page=page,
            page_size=page_size,
            total_items=total_items,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_previous=page > 1
        )
    )


@router.get(
    "/metrics",
    response_model=UnifiedWearableMetricsResponse,
    summary="Unified query endpoint for multi-dimensional wearable metrics"
)
async def get_subject_unified_metrics(
    subject_id: uuid.UUID,
    metric: Optional[str] = Query(default=None, description="Metric type filter (e.g. steps, distance, active_minutes, calories, sleep_duration, resting_heart_rate, heart_rate_variability, blood_oxygen)"),
    from_: Optional[str] = Query(default=None, alias="from", description="Start date/time filter (YYYY-MM-DD)"),
    to: Optional[str] = Query(default=None, description="End date/time filter (YYYY-MM-DD)"),
    provider: Optional[str] = Query(default=None, description="Filter by device provider (garmin, apple_health, fitbit, oura)"),
    source: Optional[str] = Query(default=None, description="Filter by source device name or reference"),
    cursor: Optional[str] = Query(default=None, description="Opaque cursor token for cursor-based pagination"),
    limit: int = Query(default=20, ge=1, le=100, description="Maximum number of metric records to return"),
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Unified multi-dimensional query endpoint for normalized wearable metrics.
    Supports filtering across metrics, providers, sources, date windows, and cursor pagination.
    """
    await service.verify_subject_access(current_user.id, subject_id)
    return await service.get_unified_metrics(
        subject_id=subject_id,
        metric=metric,
        from_date=from_,
        to_date=to,
        provider=provider,
        source=source,
        cursor=cursor,
        limit=limit
    )

