from dependency_injector import containers, providers

from app.repository.claim_response_repository import ClaimResponseRepository
from app.services.claim_response_service import ClaimResponseService


class ClaimResponseContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    claim_response_repository = providers.Factory(
        ClaimResponseRepository,
        session_factory=core.database.provided.session,
    )

    claim_response_service = providers.Factory(
        ClaimResponseService,
        repository=claim_response_repository,
    )
