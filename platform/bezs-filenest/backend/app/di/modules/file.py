"""
app.di.modules.file — DI bindings for the file domain.

Repositories require a per-request AsyncSession; they are constructed
in di/dependencies/file.py along with the service.
"""
from dependency_injector import containers, providers


class FileContainer(containers.DeclarativeContainer):
    """File domain — repo/service wiring delegated to di/dependencies/file.py."""

    core = providers.DependenciesContainer()
