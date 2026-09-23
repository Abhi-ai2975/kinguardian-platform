from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.provenance import get_provenance_service
from app.models.provenance.provenance import ProvenanceModel
from app.services.provenance_service import ProvenanceService


async def resolve_provenance(
    provenance_id: int = Path(..., ge=1, description="Public Provenance identifier."),
    provenance_service: ProvenanceService = Depends(get_provenance_service),
) -> ProvenanceModel:
    """Load Provenance by public id or raise 404."""
    prov = await provenance_service.get_raw_by_provenance_id(provenance_id)
    if not prov:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Provenance not found"
        )
    return prov
