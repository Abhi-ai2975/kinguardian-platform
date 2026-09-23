"""
app.di.container — Root DI container for the FileNest backend.

Composes all domain module containers under the shared CoreContainer.
Singletons (e.g. Database) are managed here; request-scoped construction
(repos, services) happens in di/dependencies/ via FastAPI Depends().

Usage:
    from app.di.container import Container
    container = Container()   # instantiated once in main.py
"""
from dependency_injector import containers, providers

from app.di.core import CoreContainer
from app.di.modules import FileContainer, ProjectContainer, StorageConfigContainer


class Container(containers.DeclarativeContainer):
    """Root DI container — wires infrastructure and domain modules."""

    core = providers.Container(CoreContainer)

    project = providers.Container(
        ProjectContainer,
        core=core,
    )

    file = providers.Container(
        FileContainer,
        core=core,
    )

    storage_config = providers.Container(
        StorageConfigContainer,
        core=core,
    )
