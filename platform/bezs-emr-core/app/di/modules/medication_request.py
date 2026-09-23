from dependency_injector import containers, providers

from app.repository.medication_request_repository import MedicationRequestRepository
from app.services.medication_request_service import MedicationRequestService


class MedicationRequestContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    medication_request_repository = providers.Factory(
        MedicationRequestRepository,
        session_factory=core.database.provided.session,
    )

    medication_request_service = providers.Factory(
        MedicationRequestService,
        repository=medication_request_repository,
    )
