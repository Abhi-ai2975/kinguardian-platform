from dependency_injector import containers, providers

from app.repository.medication_repository import MedicationRepository
from app.services.medication_service import MedicationService


class MedicationContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    medication_repository = providers.Factory(
        MedicationRepository,
        session_factory=core.database.provided.session,
    )

    medication_service = providers.Factory(
        MedicationService,
        repository=medication_repository,
    )
