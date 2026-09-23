"""
app.di.modules.storage_config — DI bindings for the storage-config domain.

Repositories require a per-request AsyncSession; they are constructed
in di/dependencies/storage_config.py along with the service.
"""
from dependency_injector import containers, providers


class StorageConfigContainer(containers.DeclarativeContainer):
    """StorageConfig domain — repo/service wiring delegated to di/dependencies/storage_config.py."""

    core = providers.DependenciesContainer()
