from dependency_injector import containers, providers

from app.repository.audit_event_repository import AuditEventRepository
from app.services.audit_event_service import AuditEventService


class AuditEventContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()

    audit_event_repository = providers.Factory(
        AuditEventRepository,
        session_factory=core.database.provided.session,
    )

    audit_event_service = providers.Factory(
        AuditEventService,
        repository=audit_event_repository,
    )
