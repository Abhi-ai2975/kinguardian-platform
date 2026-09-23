from dependency_injector import containers, providers

from app.repository.procedure_repository import ProcedureRepository
from app.services.procedure_service import ProcedureService


class ProcedureContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    procedure_repository = providers.Factory(
        ProcedureRepository,
        session_factory=core.database.provided.session,
    )

    procedure_service = providers.Factory(
        ProcedureService,
        repository=procedure_repository,
    )
