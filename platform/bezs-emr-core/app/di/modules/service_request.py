from dependency_injector import containers, providers

from app.repository.service_request_repository import ServiceRequestRepository
from app.services.service_request_service import ServiceRequestService


class ServiceRequestContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    service_request_repository = providers.Factory(
        ServiceRequestRepository,
        session_factory=core.database.provided.session,
    )

    service_request_service = providers.Factory(
        ServiceRequestService,
        repository=service_request_repository,
    )
