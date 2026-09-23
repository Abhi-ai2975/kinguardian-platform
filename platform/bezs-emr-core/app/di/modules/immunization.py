from dependency_injector import containers, providers

from app.repository.immunization_repository import ImmunizationRepository
from app.services.immunization_service import ImmunizationService


class ImmunizationContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()

    immunization_repository = providers.Factory(
        ImmunizationRepository,
        session_factory=core.database.provided.session,
    )

    immunization_service = providers.Factory(
        ImmunizationService,
        repository=immunization_repository,
    )
