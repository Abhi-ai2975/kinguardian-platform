import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.application.read_services import ParentHomeReadService
from app.domains.family.schemas import ParentHomeResponse

router = APIRouter(prefix="/parent", tags=["Parent"])


@router.get("/home", response_model=ParentHomeResponse)
async def get_parent_home(
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Optimized, intentionally compact read model for the Parent Home screen.
    Returns today's check-in status, today's medications, upcoming appointment,
    unread reminders, recent family messages, and pending actions.
    """
    read_service = ParentHomeReadService(db_session)
    return await read_service.get_parent_home(current_user.id)
