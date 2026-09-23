from dependency_injector import containers, providers

from app.repository.patient_repository import PatientRepository
from app.repository.vitals_repository import VitalsRepository
from app.services.vitals_service import VitalsService


class VitalsContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    vitals_repository = providers.Factory(
        VitalsRepository,
        session_factory=core.database.provided.session,
    )

    patient_repository = providers.Factory(
        PatientRepository,
        session_factory=core.database.provided.session,
    )

    vitals_service = providers.Factory(
        VitalsService,
        repository=vitals_repository,
        patient_repository=patient_repository,
    )
