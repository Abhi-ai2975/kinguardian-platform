from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.audit_event import get_audit_event_service
from app.models.audit_event.audit_event import AuditEventModel
from app.services.audit_event_service import AuditEventService


async def resolve_audit_event(
    audit_event_id: int = Path(..., ge=1, description="Public AuditEvent identifier."),
    service: AuditEventService = Depends(get_audit_event_service),
) -> AuditEventModel:
    event = await service.get_audit_event(audit_event_id)
    if event is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AuditEvent not found")
    return event
