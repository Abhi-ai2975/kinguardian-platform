from fastapi import Depends, HTTPException, Path, status

from app.models.questionnaire_response.questionnaire_response import (
    QuestionnaireResponseModel,
)
from app.services.questionnaire_response_service import QuestionnaireResponseService
from app.di.dependencies.questionnaire_response import (
    get_questionnaire_response_service,
)


async def resolve_questionnaire_response(
    questionnaire_response_id: int = Path(
        ..., ge=1, description="Public questionnaire response identifier."
    ),
    qr_service: QuestionnaireResponseService = Depends(
        get_questionnaire_response_service
    ),
) -> QuestionnaireResponseModel:
    """Load QuestionnaireResponse by public id or raise 404."""
    qr = await qr_service.get_raw_by_qr_id(questionnaire_response_id)
    if not qr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QuestionnaireResponse not found",
        )
    return qr
