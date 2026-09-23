from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.claim import get_claim_service
from app.models.claim.claim import ClaimModel
from app.services.claim_service import ClaimService


async def resolve_claim(
    claim_id: int = Path(..., ge=1, description="Public claim identifier."),
    claim_service: ClaimService = Depends(get_claim_service),
) -> ClaimModel:
    """Load claim by public id or raise 404."""
    claim = await claim_service.get_raw_by_claim_id(claim_id)
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found"
        )
    return claim
