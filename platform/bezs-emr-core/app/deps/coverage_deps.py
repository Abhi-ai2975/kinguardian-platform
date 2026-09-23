from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.coverage import get_coverage_service
from app.models.coverage.coverage import CoverageModel
from app.services.coverage_service import CoverageService


async def resolve_coverage(
    coverage_id: int = Path(..., ge=1, description="Public coverage identifier."),
    coverage_service: CoverageService = Depends(get_coverage_service),
) -> CoverageModel:
    """Load coverage by public id or raise 404."""
    coverage = await coverage_service.get_raw_by_coverage_id(coverage_id)
    if not coverage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Coverage not found"
        )
    return coverage
