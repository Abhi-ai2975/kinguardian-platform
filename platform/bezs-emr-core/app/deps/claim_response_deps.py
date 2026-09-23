from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.claim_response import get_claim_response_service
from app.models.claim_response.claim_response import ClaimResponseModel
from app.services.claim_response_service import ClaimResponseService


async def resolve_claim_response(
    claim_response_id: int = Path(..., ge=1, description="Public claim response identifier."),
    claim_response_service: ClaimResponseService = Depends(get_claim_response_service),
) -> ClaimResponseModel:
    """Load claim response by public id or raise 404."""
    claim_response = await claim_response_service.get_raw_by_claim_response_id(claim_response_id)
    if not claim_response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ClaimResponse not found"
        )
    return claim_response
