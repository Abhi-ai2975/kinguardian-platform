"""
FastAPI dependency factory for the TerminologyClient.

This module bridges the dependency-injector DI container with FastAPI's Depends()
system for the terminology endpoints. Unlike domain resources (Slot, Practitioner, etc.),
terminology has no service layer — the client is thin enough to use directly in routes,
and there are no business rules to enforce beyond what the fhir-server already checks.

TerminologyClient lives in CoreContainer (not a domain sub-container) because it is
shared infrastructure, similar to FhirClient. Route handlers reach it via
Provide[Container.core.terminology_client].
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.fhir_client.terminology import TerminologyClient


@inject
def get_terminology_client(
    # Provide[Container.core.terminology_client] resolves the Singleton TerminologyClient
    # registered in CoreContainer. Using core (not a domain sub-container) because
    # terminology is shared infrastructure, not a bounded domain.
    client: TerminologyClient = Depends(Provide[Container.core.terminology_client]),
) -> TerminologyClient:
    """
    Resolve and return the TerminologyClient Singleton from the DI container.

    Called automatically by FastAPI for every route that declares:
        client: TerminologyClient = Depends(get_terminology_client)

    The @inject decorator intercepts the call and substitutes the Provide[] default
    with the actual Singleton instance before FastAPI sees the return value.

    Returns:
        The shared TerminologyClient instance (Singleton — one httpx connection pool
        for all terminology requests in the process lifetime).
    """
    return client
