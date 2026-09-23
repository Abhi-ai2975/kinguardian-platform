from dependency_injector import containers, providers

from app.repository.slot_repository import SlotRepository
from app.services.slot_service import SlotService


class SlotContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    slot_repository = providers.Factory(
        SlotRepository,
        session_factory=core.database.provided.session,
    )

    slot_service = providers.Factory(
        SlotService,
        repository=slot_repository,
    )
