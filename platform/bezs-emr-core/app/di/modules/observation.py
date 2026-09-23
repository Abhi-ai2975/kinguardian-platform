from dependency_injector import containers, providers

from app.repository.observation_repository import ObservationRepository
from app.services.observation_service import ObservationService


class ObservationContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    observation_repository = providers.Factory(
        ObservationRepository,
        session_factory=core.database.provided.session,
    )

    observation_service = providers.Factory(
        ObservationService,
        repository=observation_repository,
    )
