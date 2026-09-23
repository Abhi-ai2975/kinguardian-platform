"""
Wearable Connection Lifecycle Router.

Provides direct endpoints for managing connected wearable devices:
- POST /wearables/connections/{id}/reconnect
- POST /wearables/connections/{id}/disconnect
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import (
    AppProfile,
    FamilyMembership,
    WearableConnection
)
from app.domains.wearables.gateway import WearableDataGateway
from app.domains.wearables.services import WearableService
from app.domains.wearables.schemas import (
    WearableConnectionFlowDescriptor,
    WearableDisconnectResponse
)

router = APIRouter(
    prefix="/wearables/connections",
    tags=["Wearables Connection API"]
)


def get_wearable_gateway() -> WearableDataGateway:
    """Dependency provider for the external WearableDataGateway port."""
    from app.domains.wearables.router import get_wearable_gateway as _get_gw
    return _get_gw()


def get_wearable_service(
    db: AsyncSession = Depends(get_db),
    gateway: WearableDataGateway = Depends(get_wearable_gateway)
) -> WearableService:
    return WearableService(session=db, gateway=gateway)


async def _verify_connection_access(
    db: AsyncSession,
    user_id: uuid.UUID,
    connection_id: uuid.UUID
) -> WearableConnection:
    """Verifies that the authenticated caller has access to the wearable connection's family circle."""
    res_conn = await db.execute(
        select(WearableConnection).where(WearableConnection.id == connection_id)
    )
    conn = res_conn.scalar_one_or_none()
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Wearable connection '{connection_id}' not found"
        )

    # Check caller family membership
    res_mem = await db.execute(
        select(FamilyMembership).where(
            FamilyMembership.family_id == conn.family_id,
            FamilyMembership.profile_id == user_id,
            FamilyMembership.status == "active"
        )
    )
    if not res_mem.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User is not an active member of this care circle."
        )

    return conn


@router.post(
    "/{id}/reconnect",
    response_model=WearableConnectionFlowDescriptor,
    summary="Regenerate connection link for existing device"
)
async def reconnect_wearable_connection(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Regenerates a fresh authentication link for an existing wearable connection.
    Returns a connection flow descriptor without exposing provider credentials.
    """
    await _verify_connection_access(db, current_user.id, id)
    try:
        return await service.reconnect_connection_by_id(connection_id=id)
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


@router.post(
    "/{id}/disconnect",
    response_model=WearableDisconnectResponse,
    summary="Revoke and disconnect wearable provider"
)
async def disconnect_wearable_connection(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    service: WearableService = Depends(get_wearable_service),
    db: AsyncSession = Depends(get_db)
):
    """
    Revokes the provider authorization and disconnects the device.
    """
    await _verify_connection_access(db, current_user.id, id)
    try:
        return await service.disconnect_connection_by_id(connection_id=id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
