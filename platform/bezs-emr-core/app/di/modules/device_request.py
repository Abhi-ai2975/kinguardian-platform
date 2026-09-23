from dependency_injector import containers, providers

from app.repository.device_request_repository import DeviceRequestRepository
from app.services.device_request_service import DeviceRequestService


class DeviceRequestContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    device_request_repository = providers.Factory(
        DeviceRequestRepository,
        session_factory=core.database.provided.session,
    )

    device_request_service = providers.Factory(
        DeviceRequestService,
        repository=device_request_repository,
    )
