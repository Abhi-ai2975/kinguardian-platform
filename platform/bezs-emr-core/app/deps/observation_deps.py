from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.observation import get_observation_service
from app.models.observation.observation import ObservationModel
from app.services.observation_service import ObservationService


async def resolve_observation(
    observation_id: int = Path(..., ge=1, description="Public observation identifier."),
    observation_service: ObservationService = Depends(get_observation_service),
) -> ObservationModel:
    """Load observation by public id or raise 404."""
    obs = await observation_service.get_raw_by_observation_id(observation_id)
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Observation not found"
        )
    return obs
