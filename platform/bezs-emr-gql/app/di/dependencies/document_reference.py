"""
FastAPI dependency bridge for DocumentReferenceService.

Translates the dependency-injector provider into a FastAPI Depends()-compatible
callable so route handlers can declare:
    service: DocumentReferenceService = Depends(get_document_reference_service)
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.document_reference_service import DocumentReferenceService


@inject
def get_document_reference_service(
    service: DocumentReferenceService = Depends(
        Provide[Container.document_reference.document_reference_service]
    ),
) -> DocumentReferenceService:
    """
    Resolve DocumentReferenceService from the DI container for use in route handlers.

    dependency-injector handles instantiation and wires the DocumentReferenceClient
    (and its underlying FhirClient) automatically.
    """
    return service
