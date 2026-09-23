from dependency_injector import containers, providers

from app.repository.episode_of_care_repository import EpisodeOfCareRepository
from app.services.episode_of_care_service import EpisodeOfCareService


class EpisodeOfCareContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()

    episode_of_care_repository = providers.Factory(
        EpisodeOfCareRepository,
        session_factory=core.database.provided.session,
    )

    episode_of_care_service = providers.Factory(
        EpisodeOfCareService,
        repository=episode_of_care_repository,
    )
