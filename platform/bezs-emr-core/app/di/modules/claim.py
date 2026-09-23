from dependency_injector import containers, providers

from app.repository.claim_repository import ClaimRepository
from app.services.claim_service import ClaimService


class ClaimContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    claim_repository = providers.Factory(
        ClaimRepository,
        session_factory=core.database.provided.session,
    )

    claim_service = providers.Factory(
        ClaimService,
        repository=claim_repository,
    )
