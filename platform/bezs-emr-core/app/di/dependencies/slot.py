from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.slot_service import SlotService


@inject
def get_slot_service(
    service: SlotService = Depends(Provide[Container.slot.slot_service]),
) -> SlotService:
    return service
