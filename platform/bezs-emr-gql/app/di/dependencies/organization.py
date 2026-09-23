"""
FastAPI dependency factory for the OrganizationsService.

This module bridges the dependency-injector DI container with FastAPI's Depends()
system. Route handlers declare `service: OrganizationsService = Depends(get_organization_service)`
and FastAPI calls this function to resolve and inject the service instance.

Why a separate function instead of using Provide[] directly in the route signature?
  - The @inject decorator from dependency-injector only works on functions it can
    intercept at import time; it cannot decorate FastAPI route functions reliably
    when they are registered after the container is wired.
  - Wrapping in a plain function allows type-safe annotations and keeps route
    handlers free of DI-library-specific imports.
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.organization_service import OrganizationsService


@inject
def get_organization_service(
    # Provide[Container.organization.organization_service] tells dependency-injector
    # to resolve the `organization_service` provider from the `organization` sub-container
    # and pass the result as the `service` argument when this function is called.
    # FastAPI sees this as a regular default value via Depends() and calls the function
    # once per request (Factory provider creates a new instance each time).
    service: OrganizationsService = Depends(Provide[Container.organization.organization_service]),
) -> OrganizationsService:
    """
    Resolve and return the OrganizationsService instance from the DI container.

    Called automatically by FastAPI for every route that declares:
        service: OrganizationsService = Depends(get_organization_service)

    The @inject decorator intercepts the call and substitutes the Provide[] default
    with the actual provider-resolved instance before FastAPI sees the return value.

    Returns:
        A fully-constructed OrganizationsService with its OrganizationClient
        dependency already injected by the container.
    """
    return service
