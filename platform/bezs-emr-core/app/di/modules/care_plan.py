from dependency_injector import containers, providers

from app.repository.care_plan_repository import CarePlanRepository
from app.services.care_plan_service import CarePlanService


class CarePlanContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()

    care_plan_repository = providers.Factory(
        CarePlanRepository,
        session_factory=core.database.provided.session,
    )

    care_plan_service = providers.Factory(
        CarePlanService,
        repository=care_plan_repository,
    )
