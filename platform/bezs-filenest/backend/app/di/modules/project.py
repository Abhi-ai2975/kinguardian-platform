"""
app.di.modules.project — DI bindings for the project domain.

Repositories require a per-request AsyncSession (for shared transactions
across ProjectRepository + StorageConfigRepository). They are constructed
in di/dependencies/project.py rather than as Factory providers here.

This container is a placeholder that participates in the wiring graph
and will hold session-factory-based bindings once repos are migrated.
"""
from dependency_injector import containers, providers


class ProjectContainer(containers.DeclarativeContainer):
    """Project domain — repo/service wiring delegated to di/dependencies/project.py."""

    core = providers.DependenciesContainer()
