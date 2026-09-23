"""
Core infrastructure DI container — holds providers for shared, long-lived dependencies.

Providers in this container are declared as Singleton so that a single instance
is created on first access and reused for every subsequent injection. This is
important for the FHIR HTTP client because httpx.AsyncClient maintains an internal
connection pool — creating a new client per request would bypass pooling and
cause connection exhaustion under load.

This container is referenced by the root Container (app.di.container) and passed
into domain-level sub-containers so they can depend on the shared client without
importing it directly.
"""

from dependency_injector import containers, providers

from app.config import settings
from app.fhir_client.client import FhirClient
from app.fhir_client.terminology import TerminologyClient


class CoreContainer(containers.DeclarativeContainer):
    """
    Provides shared infrastructure dependencies used across all domain containers.

    Holds process-scoped shared resources that should be constructed once and
    reused across all requests. Add new infrastructure clients here (not in domain
    containers) when they need connection-pool sharing.
    """

    # Singleton provider for the downstream FHIR Server HTTP client.
    # Singleton means dependency-injector constructs FhirClient exactly once on the
    # first call and returns the same instance for every subsequent injection,
    # preserving the httpx connection pool across requests.
    fhir_client = providers.Singleton(
        FhirClient,
        base_url=settings.FHIR_SERVER_URL,  # target URL from environment config
    )

    # Singleton provider for the Terminology HTTP client.
    # Terminology lives at a different base URL (/api/v1/terminology) from FHIR
    # resources (/api/fhir/v1), so it needs its own httpx client. Singleton keeps
    # the connection pool shared across all terminology requests.
    terminology_client = providers.Singleton(
        TerminologyClient,
        base_url=settings.TERMINOLOGY_SERVER_URL,
    )
