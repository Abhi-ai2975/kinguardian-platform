from dependency_injector import containers, providers

from app.repository.insurance_plan_repository import InsurancePlanRepository
from app.services.insurance_plan_service import InsurancePlanService


class InsurancePlanContainer(containers.DeclarativeContainer):
    core = providers.DependenciesContainer()

    insurance_plan_repository = providers.Factory(
        InsurancePlanRepository,
        session_factory=core.database.provided.session,
    )

    insurance_plan_service = providers.Factory(
        InsurancePlanService,
        repository=insurance_plan_repository,
    )
