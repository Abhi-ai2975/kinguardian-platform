from dependency_injector import containers, providers

from app.repository.provenance_repository import ProvenanceRepository
from app.services.provenance_service import ProvenanceService


class ProvenanceContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    provenance_repository = providers.Factory(
        ProvenanceRepository,
        session_factory=core.database.provided.session,
    )

    provenance_service = providers.Factory(
        ProvenanceService,
        repository=provenance_repository,
    )
