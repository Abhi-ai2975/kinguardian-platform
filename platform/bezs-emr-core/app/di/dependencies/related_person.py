from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.related_person_service import RelatedPersonService


@inject
def get_related_person_service(
    service: RelatedPersonService = Depends(Provide[Container.related_person.related_person_service]),
) -> RelatedPersonService:
    return service
