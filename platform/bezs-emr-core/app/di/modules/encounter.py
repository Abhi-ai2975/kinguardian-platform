from dependency_injector import containers, providers
from app.repository.encounter_repository import EncounterRepository
from app.repository.patient_repository import PatientRepository
from app.services.encounter_service import EncounterService
from app.services.patient_service import PatientService


class EncounterContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    encounter_repository = providers.Factory(
        EncounterRepository,
        session_factory=core.database.provided.session,
    )

    patient_repository = providers.Factory(
        PatientRepository,
        session_factory=core.database.provided.session,
    )

    patient_service = providers.Factory(
        PatientService,
        repository=patient_repository,
    )

    encounter_service = providers.Factory(
        EncounterService,
        repository=encounter_repository,
        patient_service=patient_service,
    )
