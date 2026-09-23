from dependency_injector import containers, providers

from app.repository.document_reference_repository import DocumentReferenceRepository
from app.services.document_reference_service import DocumentReferenceService


class DocumentReferenceContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()

    document_reference_repository = providers.Factory(
        DocumentReferenceRepository,
        session_factory=core.database.provided.session,
    )

    document_reference_service = providers.Factory(
        DocumentReferenceService,
        repository=document_reference_repository,
    )
