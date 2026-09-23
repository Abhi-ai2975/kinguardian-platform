import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import SQLAlchemyFamilyRepository
from app.domains.events.schemas import EventLogResponse
from app.domains.events.services import EventService
from app.domains.events.audit import AuditEventRecord, AuditService

router = APIRouter(prefix="/events", tags=["Events & Auditing"])


@router.get("/{circle_id}", response_model=List[EventLogResponse])
async def list_circle_events(
    circle_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    member = await circle_repo.get_member(circle_id, current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view logs for this Family group"
        )

    service = EventService(db_session)
    return await service.get_circle_events(circle_id)


@router.get("/audit/trail", response_model=List[AuditEventRecord])
async def list_audit_trail(
    family_id: uuid.UUID = Query(..., description="Care Circle / Family ID"),
    subject_id: Optional[uuid.UUID] = Query(None, description="Optional patient filter"),
    event_type: Optional[str] = Query(None, description="Optional event filter e.g. health.summary.viewed"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves enterprise audit trail events for HIPAA and data access compliance.
    """
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    member = await circle_repo.get_member(family_id, current_user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view audit trails for this family"
        )

    audit_svc = AuditService(db_session)
    return await audit_svc.list_audit_events(
        family_id=family_id,
        subject_id=subject_id,
        event_type=event_type,
        limit=limit,
        offset=offset
    )
