from dependency_injector import containers, providers

from app.repository.practitioner_role_repository import PractitionerRoleRepository
from app.services.practitioner_role_service import PractitionerRoleService


class PractitionerRoleContainer(containers.DeclarativeContainer):

    core = providers.DependenciesContainer()

    practitioner_role_repository = providers.Factory(
        PractitionerRoleRepository,
        session_factory=core.database.provided.session,
    )

    practitioner_role_service = providers.Factory(
        PractitionerRoleService,
        repository=practitioner_role_repository,
    )
