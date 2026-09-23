"""
app.di.core — Core infrastructure container.

Holds the Database singleton that is shared across all domain module
containers. The database instance wraps the async engine and exposes
the session context-manager used by repositories.

Usage:
    from app.di.container import Container
    container = Container()
"""
from dependency_injector import containers, providers

from app.core.database import Database
from app.core.config import settings


class CoreContainer(containers.DeclarativeContainer):
    """Singleton infrastructure bindings shared by every domain module."""

    database = providers.Singleton(
        Database,
        primary_url=settings.database_primary_url,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        echo=settings.is_dev,
    )
