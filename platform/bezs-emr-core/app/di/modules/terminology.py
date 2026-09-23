from dependency_injector import containers, providers

from app.repository.terminology_repository import TerminologyRepository
from app.services.terminology_service import TerminologyService


class TerminologyContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()

    terminology_repository = providers.Factory(
        TerminologyRepository,
        session_factory=core.database.provided.session,
    )

    terminology_service = providers.Factory(
        TerminologyService,
        repository=terminology_repository,
    )
