from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.procedure import get_procedure_service
from app.models.procedure.procedure import ProcedureModel
from app.services.procedure_service import ProcedureService


async def resolve_procedure(
    procedure_id: int = Path(..., ge=1, description="Public procedure identifier."),
    procedure_service: ProcedureService = Depends(get_procedure_service),
) -> ProcedureModel:
    """Load procedure by public id or raise 404."""
    proc = await procedure_service.get_raw_by_procedure_id(procedure_id)
    if not proc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Procedure not found"
        )
    return proc
