from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.audit_event_service import AuditEventService


@inject
def get_audit_event_service(
    service: AuditEventService = Depends(Provide[Container.audit_event.audit_event_service]),
) -> AuditEventService:
    return service
