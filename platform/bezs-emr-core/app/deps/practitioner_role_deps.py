from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.practitioner_role import get_practitioner_role_service
from app.models.practitioner_role.practitioner_role import PractitionerRoleModel
from app.services.practitioner_role_service import PractitionerRoleService


async def resolve_practitioner_role(
    practitioner_role_id: int = Path(..., ge=1, description="Public practitioner role identifier."),
    pr_service: PractitionerRoleService = Depends(get_practitioner_role_service),
) -> PractitionerRoleModel:
    """Load practitioner role by public id or raise 404."""
    pr = await pr_service.get_raw_by_practitioner_role_id(practitioner_role_id)
    if not pr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="PractitionerRole not found"
        )
    return pr
