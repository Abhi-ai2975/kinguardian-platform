from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.insurance_plan import get_insurance_plan_service
from app.models.insurance_plan.insurance_plan import InsurancePlanModel
from app.services.insurance_plan_service import InsurancePlanService


async def resolve_insurance_plan(
    insurance_plan_id: int = Path(..., ge=1, description="Public InsurancePlan identifier."),
    insurance_plan_service: InsurancePlanService = Depends(get_insurance_plan_service),
) -> InsurancePlanModel:
    ip = await insurance_plan_service.get_insurance_plan(insurance_plan_id)
    if not ip:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"InsurancePlan {insurance_plan_id} not found.",
        )
    return ip
