"""
FastAPI dependency factory for the HealthcareServiceService.

This module bridges the dependency-injector DI container with FastAPI's Depends()
system. Route handlers declare
    `service: HealthcareServiceService = Depends(get_healthcare_service_service)`
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
from app.services.healthcare_service_service import HealthcareServiceService


@inject
def get_healthcare_service_service(
    # Provide[Container.healthcare_service.healthcare_service_service] tells
    # dependency-injector to resolve the `healthcare_service_service` provider from
    # the `healthcare_service` sub-container and pass the result as the `service`
    # argument when this function is called. FastAPI sees this as a regular default
    # value via Depends() and calls the function once per request (Factory creates
    # a new instance each time).
    service: HealthcareServiceService = Depends(
        Provide[Container.healthcare_service.healthcare_service_service]
    ),
) -> HealthcareServiceService:
    """
    Resolve and return the HealthcareServiceService instance from the DI container.

    Called automatically by FastAPI for every route that declares:
        service: HealthcareServiceService = Depends(get_healthcare_service_service)

    The @inject decorator intercepts the call and substitutes the Provide[] default
    with the actual provider-resolved instance before FastAPI sees the return value.

    Returns:
        A fully-constructed HealthcareServiceService with its HealthcareServiceClient
        dependency already injected by the container.
    """
    return service
