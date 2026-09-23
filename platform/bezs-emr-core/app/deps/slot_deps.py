from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.slot import get_slot_service
from app.models.slot.slot import SlotModel
from app.services.slot_service import SlotService


async def resolve_slot(
    slot_id: int = Path(..., ge=1, description="Public slot identifier."),
    slot_service: SlotService = Depends(get_slot_service),
) -> SlotModel:
    """Load slot by public id or raise 404."""
    slot = await slot_service.get_raw_by_slot_id(slot_id)
    if not slot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Slot not found"
        )
    return slot
