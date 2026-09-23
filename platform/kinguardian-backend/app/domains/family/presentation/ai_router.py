import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.family.schemas import (
    AIConversationStartRequest,
    AIConversationResponse,
    AIMessageRequest,
    AIMessageResponse,
    AIInsightGenerateRequest,
    AIInsightResponse,
    AIAppointmentPrepareRequest,
    AIActionProposeRequest,
    AIActionRejectRequest,
    AIActionResponse
)
from app.domains.family.domain.exceptions import FamilyAccessError


router = APIRouter(prefix="/ai", tags=["AI Facade"])


def get_family_service(session: AsyncSession) -> FamilyService:
    user_repo = SQLAlchemyAppProfileRepository(session)
    circle_repo = SQLAlchemyFamilyRepository(session)
    consent_repo = SQLAlchemyConsentRepository(session)
    event_logger = EventService(session)
    return FamilyService(user_repo, circle_repo, consent_repo, event_logger)


@router.post("/conversations", response_model=AIConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_conversation(
    payload: AIConversationStartRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    KinGuardian AI Facade:
    Starts an application-managed AI conversation session for a family/subject context.
    Does not expose raw agent runtime endpoints directly to mobile clients.
    """
    service = get_family_service(db_session)
    try:
        return await service.start_ai_conversation(
            requester_id=current_user.id,
            family_id=payload.family_id,
            subject_id=payload.subject_id,
            conversation_type=payload.conversation_type,
            context_scope=payload.context_scope
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/conversations/{id}", response_model=AIConversationResponse)
async def get_ai_conversation(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves AI conversation metadata and session context.
    """
    service = get_family_service(db_session)
    try:
        return await service.get_ai_conversation_by_id(
            requester_id=current_user.id,
            conversation_id=id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/conversations/{id}/messages", response_model=AIMessageResponse)
async def send_ai_conversation_message(
    id: uuid.UUID,
    payload: AIMessageRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Sends a message to the AI conversation session.
    The KinGuardian AI Facade evaluates the prompt in clinical context and returns an actionable response.
    """
    service = get_family_service(db_session)
    try:
        return await service.send_ai_conversation_message(
            requester_id=current_user.id,
            conversation_id=id,
            content=payload.content,
            context_override=payload.context_override
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/conversations/{id}/messages", response_model=List[AIMessageResponse])
async def get_ai_conversation_messages(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves the chronological list of messages exchanged in this AI conversation session.
    """
    service = get_family_service(db_session)
    try:
        return await service.get_ai_conversation_messages(
            requester_id=current_user.id,
            conversation_id=id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/insights/generate", response_model=AIInsightResponse, status_code=status.HTTP_201_CREATED)
async def generate_ai_insights(
    payload: AIInsightGenerateRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    KinGuardian AI Facade:
    Triggers automated clinical insights and Guardian Moments generation for a subject.
    """
    service = get_family_service(db_session)
    try:
        return await service.generate_subject_ai_insights(
            requester_id=current_user.id,
            family_id=payload.family_id,
            subject_id=payload.subject_id,
            insight_type=payload.insight_type or "medication_adherence_trend",
            timeframe_days=payload.timeframe_days
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/appointments/{id}/prepare")
async def prepare_ai_appointment(
    id: str,
    payload: Optional[AIAppointmentPrepareRequest] = None,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    KinGuardian AI Facade:
    Generates intelligent preparation agendas and questions for the doctor ahead of a clinical appointment.
    """
    service = get_family_service(db_session)
    try:
        return await service.prepare_ai_appointment(
            requester_id=current_user.id,
            appointment_id=id,
            custom_focus_areas=payload.custom_focus_areas if payload else None,
            notes=payload.notes if payload else None
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/actions/propose", response_model=AIActionResponse, status_code=status.HTTP_201_CREATED)
async def propose_ai_action(
    payload: AIActionProposeRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    AI Safety Workflow:
    Proposes an AI action. High-risk actions (medication modification, diagnosis changes,
    appointment cancellation, sharing medical records) are strictly gated and enter
    'pending_approval' requiring explicit human confirmation before execution.
    """
    service = get_family_service(db_session)
    try:
        return await service.propose_ai_action(
            requester_id=current_user.id,
            family_id=payload.family_id,
            subject_id=payload.subject_id,
            action_type=payload.action_type,
            input_data=payload.input_data,
            agent_session_id=payload.agent_session_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/actions", response_model=List[AIActionResponse])
async def list_ai_actions(
    family_id: uuid.UUID,
    subject_id: Optional[uuid.UUID] = None,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists proposed, approved, and executed AI actions for a family or subject.
    """
    service = get_family_service(db_session)
    try:
        return await service.list_ai_actions(
            requester_id=current_user.id,
            family_id=family_id,
            subject_id=subject_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/actions/{id}", response_model=AIActionResponse)
async def get_ai_action(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves details and risk metadata for a specific AI action.
    """
    service = get_family_service(db_session)
    try:
        return await service.get_ai_action_by_id(
            requester_id=current_user.id,
            action_id=id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/actions/{id}/approve", response_model=AIActionResponse)
async def approve_ai_action(
    id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Human-in-the-Loop Confirmation:
    Human coordinator or caregiver explicitly confirms and executes a proposed high-risk AI action.
    """
    service = get_family_service(db_session)
    try:
        return await service.approve_and_execute_ai_action(
            requester_id=current_user.id,
            action_id=id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/actions/{id}/reject", response_model=AIActionResponse)
async def reject_ai_action(
    id: uuid.UUID,
    payload: Optional[AIActionRejectRequest] = None,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Human Rejection:
    Human coordinator or caregiver rejects a proposed AI action.
    """
    service = get_family_service(db_session)
    try:
        return await service.reject_ai_action(
            requester_id=current_user.id,
            action_id=id,
            reason=payload.reason if payload else None
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

