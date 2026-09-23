"""
Wearable Presentation Router.
Provides mobile client endpoints for managing connected wearable devices,
inspecting daily activity & sleep metrics, and retrieving aggregated dashboard telemetry.
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile, FamilyMembership, CareSubject, Family

from app.domains.wearables.services import WearableService
from app.domains.wearables.schemas import (
    DeviceConnectionResponse,
    DeviceConnectUrlResponse,
    WearableActivitySummary,
    WearableSleepSummary,
    WearableRecoverySummary,
    WearableDashboardResponse,
    WearableConnectionPermissionsResponse,
    UpdateWearablePermissionsRequest,
    WearableConsentStatusResponse,
    WearableConsentGrantRequest
)

from sqlalchemy import select


router = APIRouter(
    prefix="/families/{family_id}/subjects/{subject_id}/wearables",
    tags=["Wearables & Devices"]
)


def get_wearable_service(session: AsyncSession = Depends(get_db)) -> WearableService:
    return WearableService(session=session)


    return WearableService(session=session)


@router.get(
    "/connections",
    response_model=List[DeviceConnectionResponse],
    summary="List connected wearable devices"
)
async def list_subject_wearable_connections(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service)
):
    """
    Returns all active and historical wearable device connections (Garmin, Oura, Apple Health, Fitbit)
    associated with the care subject.
    """
    await service.verify_family_access(current_user.id, family_id)
    return await service.get_subject_connections(subject_id)


@router.get(
    "/consent/status",
    response_model=WearableConsentStatusResponse,
    summary="Get wearable health data consent status and mandatory disclosures"
)
async def get_wearable_consent_status(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service)
):
    """
    Returns consent status along with the pre-connection checklist:
    - What KinGuardian can receive: Activity, Sleep, Heart rate
    - Revocation guarantee: You can disconnect this device at any time.
    """
    await service.verify_family_access(current_user.id, family_id)
    return await service.get_consent_status(family_id, subject_id, current_user.id)


@router.post(
    "/consent/grant",
    response_model=WearableConsentStatusResponse,
    summary="Grant parent/coordinator consent for wearable health data ingestion"
)
async def grant_wearable_consent(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    payload: WearableConsentGrantRequest,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service)
):
    """
    Explicitly grants consent for KinGuardian to receive wearable health telemetry
    (Activity, Sleep, Heart rate).
    """
    await service.verify_family_access(current_user.id, family_id)

    # Resolve grantor/grantee
    grantor_id = payload.grantor_profile_id or current_user.id
    grantee_id = payload.grantee_profile_id or current_user.id

    return await service.grant_wearable_consent(
        family_id=family_id,
        subject_id=subject_id,
        grantor_profile_id=grantor_id,
        grantee_profile_id=grantee_id,
        scopes=payload.scopes
    )



@router.post(
    "/consent/revoke",
    response_model=WearableConsentStatusResponse,
    summary="Revoke consent and disconnect all wearable health devices"
)
async def revoke_wearable_consent(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Revokes wearable consent at any time. Immediately pauses ingestion and marks connections as disconnected.
    """
    await service.verify_family_access(current_user.id, family_id)
    return await service.revoke_wearable_consent(family_id, subject_id, current_user.id)


@router.post(
    "/connect/{provider}",
    response_model=DeviceConnectUrlResponse,
    summary="Generate wearable device connection link or mobile SDK token"
)
async def generate_wearable_connect_link(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    provider: str,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates an OAuth authorization link or mobile SDK sync token (Apple Health / Health Connect)
    via Open Wearables. Enforces authorization layer consent check.
    """
    await service.verify_family_access(current_user.id, family_id)
    try:
        return await service.create_connection_invitation(subject_id, provider)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))



@router.get(
    "/connections/{provider_or_id}/permissions",
    response_model=WearableConnectionPermissionsResponse,
    summary="Get granular permissions and scope explanations for a connection"
)
async def get_connection_permissions(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    provider_or_id: str,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns the granular permissions/scope granted to a wearable device connection,
    along with clear, human-readable explanations of what data is shared.
    """
    await service.verify_family_access(current_user.id, family_id)
    try:
        return await service.get_connection_permissions(subject_id, provider_or_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.put(
    "/connections/{provider_or_id}/permissions",
    response_model=WearableConnectionPermissionsResponse,
    summary="Update granular permissions and scopes for a connection"
)
async def update_connection_permissions(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    provider_or_id: str,
    payload: UpdateWearablePermissionsRequest,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Updates the granted telemetry scopes (e.g. activity, sleep, heart_rate, workouts, weight).
    """
    await service.verify_family_access(current_user.id, family_id)
    try:
        return await service.update_connection_permissions(subject_id, provider_or_id, payload.permissions)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))



@router.get(
    "/activity",
    response_model=List[WearableActivitySummary],
    summary="Get wearable daily activity history"
)
async def get_subject_activity_history(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    days: int = Query(default=7, ge=1, le=90, description="Number of past days to retrieve"),
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns daily aggregated activity metrics (steps, active minutes, calories burned)
    synced from connected wearable devices.
    """
    await service.verify_family_access(current_user.id, family_id)
    return await service.get_activity_history(subject_id, days=days)


@router.get(
    "/sleep",
    response_model=List[WearableSleepSummary],
    summary="Get wearable daily sleep architecture history"
)
async def get_subject_sleep_history(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    days: int = Query(default=7, ge=1, le=90, description="Number of past days to retrieve"),
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns daily sleep duration, sleep scores, efficiency percentages, and sleep stages (deep, REM, light).
    """
    await service.verify_family_access(current_user.id, family_id)
    return await service.get_sleep_history(subject_id, days=days)


@router.get(
    "/recovery",
    response_model=List[WearableRecoverySummary],
    summary="Get wearable daily recovery & physiological metrics"
)
async def get_subject_recovery_history(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    days: int = Query(default=7, ge=1, le=90, description="Number of past days to retrieve"),
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns resting heart rate, Heart Rate Variability (HRV), blood oxygen saturation (SpO2),
    and recovery scores.
    """
    await service.verify_family_access(current_user.id, family_id)
    return await service.get_recovery_history(subject_id, days=days)


@router.get(
    "/dashboard",
    response_model=WearableDashboardResponse,
    summary="Get single-roundtrip wearable health dashboard overview"
)
async def get_subject_wearable_dashboard(
    family_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Optimized single-roundtrip endpoint returning connected providers, latest activity/sleep/recovery vitals,
    weekly averages, and baseline trend anomaly diagnostics.
    """
    await service.verify_family_access(current_user.id, family_id)
    return await service.get_wearable_dashboard(subject_id)
