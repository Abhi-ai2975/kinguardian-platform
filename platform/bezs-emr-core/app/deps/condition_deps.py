from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.condition import get_condition_service
from app.models.condition.condition import ConditionModel
from app.services.condition_service import ConditionService


async def resolve_condition(
    condition_id: int = Path(..., ge=1, description="Public condition identifier."),
    condition_service: ConditionService = Depends(get_condition_service),
) -> ConditionModel:
    """Load condition by public id or raise 404."""
    condition = await condition_service.get_raw_by_condition_id(condition_id)
    if not condition:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Condition not found"
        )
    return condition
