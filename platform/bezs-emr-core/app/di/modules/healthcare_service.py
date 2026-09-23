from dependency_injector import containers, providers

from app.repository.healthcare_service_repository import HealthcareServiceRepository
from app.services.healthcare_service_service import HealthcareServiceService


class HealthcareServiceContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    healthcare_service_repository = providers.Factory(
        HealthcareServiceRepository,
        session_factory=core.database.provided.session,
    )

    healthcare_service_service = providers.Factory(
        HealthcareServiceService,
        repository=healthcare_service_repository,
    )
