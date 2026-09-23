from dependency_injector import containers, providers

from app.repository.location_repository import LocationRepository
from app.services.location_service import LocationService


class LocationContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    location_repository = providers.Factory(
        LocationRepository,
        session_factory=core.database.provided.session,
    )

    location_service = providers.Factory(
        LocationService,
        repository=location_repository,
    )
