from dependency_injector import containers, providers

from app.repository.related_person_repository import RelatedPersonRepository
from app.services.related_person_service import RelatedPersonService


class RelatedPersonContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()

    related_person_repository = providers.Factory(
        RelatedPersonRepository,
        session_factory=core.database.provided.session,
    )

    related_person_service = providers.Factory(
        RelatedPersonService,
        repository=related_person_repository,
    )
