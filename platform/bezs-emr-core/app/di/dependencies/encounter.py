from dependency_injector.wiring import inject, Provide
from fastapi import Depends
from app.services.encounter_service import EncounterService
from app.di.container import Container


@inject
def get_encounter_service(
    service: EncounterService = Depends(Provide[Container.encounter.encounter_service]),
) -> EncounterService:
    return service
