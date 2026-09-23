from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.care_plan import get_care_plan_service
from app.models.care_plan.care_plan import CarePlanModel
from app.services.care_plan_service import CarePlanService


async def resolve_care_plan(
    care_plan_id: int = Path(..., ge=1, description="Public CarePlan identifier."),
    care_plan_service: CarePlanService = Depends(get_care_plan_service),
) -> CarePlanModel:
    care_plan = await care_plan_service.get_care_plan(care_plan_id)
    if not care_plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CarePlan {care_plan_id} not found.",
        )
    return care_plan
