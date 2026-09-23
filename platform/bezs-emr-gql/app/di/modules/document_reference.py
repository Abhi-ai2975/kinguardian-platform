"""
Dependency-injection sub-container for the DocumentReference domain.

Wires DocumentReferenceClient and DocumentReferenceService as Factory providers so each
request receives a fresh, stateless instance.
"""

from dependency_injector import containers, providers

from app.fhir_client.document_reference import DocumentReferenceClient
from app.services.document_reference_service import DocumentReferenceService


class DocumentReferenceContainer(containers.DeclarativeContainer):
    """
    DI sub-container for DocumentReference resources.

    `core` is a DependenciesContainer placeholder replaced by the root Container
    at wiring time, giving access to `core.fhir_client`.
    """

    # Placeholder resolved by the root Container when this sub-container is mounted.
    core = providers.DependenciesContainer()

    # Domain-specific HTTP client for DocumentReference endpoints on the fhir-server.
    document_reference_client = providers.Factory(
        DocumentReferenceClient,
        fhir=core.fhir_client,
    )

    # Business logic service — sits between the router and DocumentReferenceClient.
    document_reference_service = providers.Factory(
        DocumentReferenceService,
        client=document_reference_client,
    )
