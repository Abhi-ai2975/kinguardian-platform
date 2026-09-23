from dependency_injector import containers, providers

from app.repository.schedule_repository import ScheduleRepository
from app.services.schedule_service import ScheduleService


class ScheduleContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    schedule_repository = providers.Factory(
        ScheduleRepository,
        session_factory=core.database.provided.session,
    )

    schedule_service = providers.Factory(
        ScheduleService,
        repository=schedule_repository,
    )
