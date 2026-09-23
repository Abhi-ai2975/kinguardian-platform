from dependency_injector import containers, providers

from app.repository.coverage_repository import CoverageRepository
from app.services.coverage_service import CoverageService


class CoverageContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    coverage_repository = providers.Factory(
        CoverageRepository,
        session_factory=core.database.provided.session,
    )

    coverage_service = providers.Factory(
        CoverageService,
        repository=coverage_repository,
    )
