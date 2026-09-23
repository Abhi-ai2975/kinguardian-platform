"""
FastAPI dependency factory for the LocationService.

This module bridges the dependency-injector DI container with FastAPI's Depends()
system. Route handlers declare `service: LocationService = Depends(get_location_service)`
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
from app.services.location_service import LocationService


@inject
def get_location_service(
    # Provide[Container.location.location_service] tells dependency-injector to
    # resolve the `location_service` provider from the `location` sub-container
    # and pass the result as the `service` argument when this function is called.
    # FastAPI sees this as a regular default value via Depends() and calls the function
    # once per request (Factory provider creates a new instance each time).
    service: LocationService = Depends(Provide[Container.location.location_service]),
) -> LocationService:
    """
    Resolve and return the LocationService instance from the DI container.

    Called automatically by FastAPI for every route that declares:
        service: LocationService = Depends(get_location_service)

    The @inject decorator intercepts the call and substitutes the Provide[] default
    with the actual provider-resolved instance before FastAPI sees the return value.

    Returns:
        A fully-constructed LocationService with its LocationClient dependency
        already injected by the container.
    """
    return service
