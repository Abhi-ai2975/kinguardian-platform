from dependency_injector import containers, providers
from app.repository.appointment_repository import AppointmentRepository
from app.services.appointment_service import AppointmentService


class AppointmentContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    appointment_repository = providers.Factory(
        AppointmentRepository,
        session_factory=core.database.provided.session,
    )

    appointment_service = providers.Factory(
        AppointmentService,
        repository=appointment_repository,
    )
