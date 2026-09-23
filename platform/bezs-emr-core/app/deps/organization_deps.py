from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.organization import get_organization_service
from app.models.organization.organization import OrganizationModel
from app.services.organization_service import OrganizationService


async def resolve_organization(
    organization_id: int = Path(..., ge=1, description="Public organization identifier."),
    organization_service: OrganizationService = Depends(get_organization_service),
) -> OrganizationModel:
    """Load organization by public id or raise 404."""
    org = await organization_service.get_raw_by_organization_id(organization_id)
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )
    return org
