from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.document_reference import get_document_reference_service
from app.models.document_reference.document_reference import DocumentReferenceModel
from app.services.document_reference_service import DocumentReferenceService


async def resolve_document_reference(
    document_reference_id: int = Path(..., ge=1, description="Public DocumentReference identifier."),
    service: DocumentReferenceService = Depends(get_document_reference_service),
) -> DocumentReferenceModel:
    dr = await service.get_document_reference(document_reference_id)
    if dr is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DocumentReference not found")
    return dr
