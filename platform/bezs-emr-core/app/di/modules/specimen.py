from dependency_injector import containers, providers

from app.repository.specimen_repository import SpecimenRepository
from app.services.specimen_service import SpecimenService


class SpecimenContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()

    specimen_repository = providers.Factory(
        SpecimenRepository,
        session_factory=core.database.provided.session,
    )

    specimen_service = providers.Factory(
        SpecimenService,
        repository=specimen_repository,
    )
