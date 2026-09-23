"""
HTTP Routers Package:
Exposes all domain endpoint controllers.
"""

from app.domains.family.presentation.families_router import router as families_router
from app.domains.family.presentation.care_tasks_router import router as care_tasks_router
from app.domains.family.presentation.appointments_router import router as appointments_router
from app.domains.family.presentation.ai_router import router as ai_router
from app.domains.family.presentation.i18n_router import router as i18n_router
from app.domains.clinical.router import router as clinical_router
from app.domains.notifications.router import router as notifications_router
from app.domains.documents.router import router as documents_router
from app.domains.agent.router import router as agent_router
from app.domains.events.router import router as events_router

__all__ = [
    "families_router",
    "care_tasks_router",
    "appointments_router",
    "ai_router",
    "i18n_router",
    "clinical_router",
    "notifications_router",
    "documents_router",
    "agent_router",
    "events_router"
]
