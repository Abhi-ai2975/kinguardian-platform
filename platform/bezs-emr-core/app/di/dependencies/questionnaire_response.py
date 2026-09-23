from dependency_injector.wiring import inject, Provide
from fastapi import Depends
from app.services.questionnaire_response_service import QuestionnaireResponseService
from app.di.container import Container


@inject
def get_questionnaire_response_service(
    service: QuestionnaireResponseService = Depends(
        Provide[Container.questionnaire_response.questionnaire_response_service]
    ),
) -> QuestionnaireResponseService:
    return service
