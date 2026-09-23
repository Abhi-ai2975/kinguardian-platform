from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.document_reference_service import DocumentReferenceService


@inject
def get_document_reference_service(
    service: DocumentReferenceService = Depends(Provide[Container.document_reference.document_reference_service]),
) -> DocumentReferenceService:
    return service
