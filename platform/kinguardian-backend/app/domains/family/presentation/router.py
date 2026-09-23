import uuid
from typing import List, Optional, Dict, Any
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
from app.domains.family.domain.exceptions import DomainError, ProfileNotFoundError, FamilyAccessError, DuplicateMembershipError
from app.domains.family.application.read_services import CoordinatorHomeReadService
from app.domains.family.schemas import (
    CareCircleCreate,
    CareCircleResponse,
    CareCircleMemberResponse,
    ConsentCreate,
    ConsentResponse,
    FamilyRelationshipCreate,
    FamilyRelationshipResponse,
    CareSubjectCreate,
    CareSubjectResponse,
    CareRelationshipCreate,
    CareRelationshipResponse,
    CareTaskCreate,
    CareTaskResponse,
    AdherenceEventCreate,
    AdherenceEventResponse,
    WellbeingCheckinCreate,
    WellbeingCheckinResponse,
    MonitoringPreferenceCreate,
    MonitoringPreferenceUpdate,
    MonitoringPreferenceResponse,
    AIInsightCreate,
    AIInsightResponse,
    AIInsightSourceCreate,
    AIInsightSourceResponse,
    NotificationCreate,
    NotificationResponse,
    NotificationDeliveryCreate,
    NotificationDeliveryUpdate,
    NotificationDeliveryResponse,
    FamilyConversationCreate,
    FamilyConversationResponse,
    FamilyMessageCreate,
    FamilyMessageResponse,
    AppointmentCoordinationCreate,
    AppointmentCoordinationUpdate,
    AppointmentCoordinationResponse,
    HealthDocumentCreate,
    HealthDocumentUpdate,
    HealthDocumentResponse,
    DocumentExtractionCreate,
    DocumentExtractionReview,
    DocumentExtractionResponse,
    AIConversationCreate,
    AIConversationResponse,
    AIActionCreate,
    AIActionReview,
    AIActionResponse,
    CoordinatorHomeResponse
)

router = APIRouter(prefix="/family", tags=["Family"])


def get_family_service(session: AsyncSession) -> FamilyService:
    return FamilyService(
        user_repo=SQLAlchemyAppProfileRepository(session),
        circle_repo=SQLAlchemyFamilyRepository(session),
        consent_repo=SQLAlchemyConsentRepository(session),
        event_logger=EventService(session)
    )


@router.get("/home", response_model=CoordinatorHomeResponse)
async def get_coordinator_home(
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    read_service = CoordinatorHomeReadService(db_session)
    return await read_service.get_coordinator_home(current_user.id)



def map_domain_error(e: DomainError) -> HTTPException:
    if isinstance(e, ProfileNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    elif isinstance(e, FamilyAccessError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    elif isinstance(e, DuplicateMembershipError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An internal error occurred.")


@router.post("/circles", response_model=CareCircleResponse, status_code=status.HTTP_201_CREATED)
async def create_care_circle(
    payload: CareCircleCreate,
    creator_role: str = "coordinator",
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.create_care_circle(
            creator_id=current_user.id,
            name=payload.name,
            creator_role=creator_role
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles", response_model=List[CareCircleResponse])
async def list_care_circles(
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    return await service.list_user_circles(current_user.id)


@router.post("/circles/{circle_id}/members", response_model=CareCircleMemberResponse)
async def add_circle_member(
    circle_id: uuid.UUID,
    target_email: str,
    role: str = "caregiver",
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_member_to_circle(
            requester_id=current_user.id,
            care_circle_id=circle_id,
            target_email=target_email,
            role=role
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.delete("/circles/{circle_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_circle_member(
    circle_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        success = await service.remove_member_from_circle(
            requester_id=current_user.id,
            care_circle_id=circle_id,
            target_user_id=user_id
        )
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member association not found"
            )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/consents", response_model=ConsentResponse)
async def grant_or_update_consent(
    payload: ConsentCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    result = await db_session.get(AppProfile, payload.grantee_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Grantee profile not found"
        )
        
    try:
        return await service.set_consent(
            grantor_id=current_user.id,
            family_id=payload.family_id,
            subject_id=payload.subject_id,
            grantee_email=result.email,
            scope=payload.scope,
            status=payload.status
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/consents", response_model=List[ConsentResponse])
async def list_granted_consents(
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    return await service.get_consent_list_for_parent(current_user.id)


@router.post("/circles/{circle_id}/relationships", response_model=FamilyRelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_family_relationship(
    circle_id: uuid.UUID,
    payload: FamilyRelationshipCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_relationship(
            requester_id=current_user.id,
            family_id=circle_id,
            from_profile_id=payload.from_profile_id,
            to_profile_id=payload.to_profile_id,
            relationship_type=payload.relationship_type
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/relationships", response_model=List[FamilyRelationshipResponse])
async def list_family_relationships(
    circle_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_relationships(
            requester_id=current_user.id,
            family_id=circle_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/subjects", response_model=CareSubjectResponse, status_code=status.HTTP_201_CREATED)
async def create_care_subject(
    circle_id: uuid.UUID,
    payload: CareSubjectCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_care_subject(
            requester_id=current_user.id,
            family_id=circle_id,
            fhir_patient_id=payload.fhir_patient_id,
            profile_id=payload.profile_id,
            relationship_to_coordinator=payload.relationship_to_coordinator,
            city=payload.city,
            country_code=payload.country_code,
            timezone=payload.timezone
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/subjects", response_model=List[CareSubjectResponse])
async def list_care_subjects(
    circle_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_care_subjects(
            requester_id=current_user.id,
            family_id=circle_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/care-relationships", response_model=CareRelationshipResponse, status_code=status.HTTP_201_CREATED)
async def create_care_relationship(
    circle_id: uuid.UUID,
    payload: CareRelationshipCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_care_relationship(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=payload.subject_id,
            profile_id=payload.profile_id,
            relationship_type=payload.relationship_type,
            access_level=payload.access_level,
            starts_at=payload.starts_at,
            ends_at=payload.ends_at
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/care-relationships", response_model=List[CareRelationshipResponse])
async def list_care_relationships(
    circle_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_care_relationships(
            requester_id=current_user.id,
            family_id=circle_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/tasks", response_model=CareTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_care_task(
    circle_id: uuid.UUID,
    payload: CareTaskCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_care_task(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=payload.subject_id,
            assigned_to_profile_id=payload.assigned_to_profile_id,
            title=payload.title,
            description=payload.description,
            category=payload.category,
            priority=payload.priority,
            due_at=payload.due_at
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/tasks/{task_id}/complete", response_model=CareTaskResponse)
async def complete_care_task(
    circle_id: uuid.UUID,
    task_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.complete_care_task(
            requester_id=current_user.id,
            family_id=circle_id,
            task_id=task_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/tasks", response_model=List[CareTaskResponse])
async def list_care_tasks(
    circle_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_care_tasks(
            requester_id=current_user.id,
            family_id=circle_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/adherence", response_model=AdherenceEventResponse, status_code=status.HTTP_201_CREATED)
async def record_medication_adherence(
    circle_id: uuid.UUID,
    payload: AdherenceEventCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.record_adherence_event(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=payload.subject_id,
            fhir_medication_request_id=payload.fhir_medication_request_id,
            scheduled_at=payload.scheduled_at,
            status=payload.status,
            source=payload.source
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/subjects/{subject_id}/adherence", response_model=List[AdherenceEventResponse])
async def list_medication_adherence(
    circle_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_adherence_events(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=subject_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/checkins", response_model=WellbeingCheckinResponse, status_code=status.HTTP_201_CREATED)
async def create_wellbeing_checkin(
    circle_id: uuid.UUID,
    payload: WellbeingCheckinCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_wellbeing_checkin(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=payload.subject_id,
            feeling=payload.feeling,
            notes=payload.notes,
            voice_file_id=payload.voice_file_id,
            severity=payload.severity
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/subjects/{subject_id}/checkins", response_model=List[WellbeingCheckinResponse])
async def list_wellbeing_checkins(
    circle_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_wellbeing_checkins(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=subject_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/monitoring", response_model=MonitoringPreferenceResponse, status_code=status.HTTP_201_CREATED)
async def create_monitoring_preference(
    circle_id: uuid.UUID,
    payload: MonitoringPreferenceCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_monitoring_preference(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=payload.subject_id,
            metric=payload.metric,
            baseline_period_days=payload.baseline_period_days,
            threshold_config=payload.threshold_config,
            notification_level=payload.notification_level,
            enabled=payload.enabled
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/monitoring/{preference_id}", response_model=MonitoringPreferenceResponse)
async def update_monitoring_preference(
    circle_id: uuid.UUID,
    preference_id: uuid.UUID,
    payload: MonitoringPreferenceUpdate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.update_monitoring_preference(
            requester_id=current_user.id,
            family_id=circle_id,
            preference_id=preference_id,
            enabled=payload.enabled,
            threshold_config=payload.threshold_config
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/subjects/{subject_id}/monitoring", response_model=List[MonitoringPreferenceResponse])
async def list_monitoring_preferences(
    circle_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_monitoring_preferences(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=subject_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/insights", response_model=AIInsightResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_insight(
    circle_id: uuid.UUID,
    payload: AIInsightCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_ai_insight(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=payload.subject_id,
            type=payload.type,
            severity=payload.severity,
            title=payload.title,
            summary=payload.summary,
            observation=payload.observation,
            recommendation=payload.recommendation,
            timeframe_start=payload.timeframe_start,
            timeframe_end=payload.timeframe_end,
            confidence=payload.confidence,
            status=payload.status,
            generated_by=payload.generated_by,
            agent_run_id=payload.agent_run_id,
            trigger_type=payload.trigger_type,
            baseline_comparison=payload.baseline_comparison,
            actionability=payload.actionability
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/insights/{insight_id}/dismiss", response_model=AIInsightResponse)
async def dismiss_ai_insight(
    circle_id: uuid.UUID,
    insight_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.dismiss_ai_insight(
            requester_id=current_user.id,
            family_id=circle_id,
            insight_id=insight_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/subjects/{subject_id}/insights", response_model=List[AIInsightResponse])
async def list_ai_insights(
    circle_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_ai_insights(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=subject_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/insights/{insight_id}/sources", response_model=AIInsightSourceResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_insight_source(
    circle_id: uuid.UUID,
    insight_id: uuid.UUID,
    payload: AIInsightSourceCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_ai_insight_source(
            requester_id=current_user.id,
            family_id=circle_id,
            insight_id=insight_id,
            source_type=payload.source_type,
            source_id=payload.source_id,
            source_version=payload.source_version,
            metadata=payload.metadata
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/insights/{insight_id}/sources", response_model=List[AIInsightSourceResponse])
async def list_ai_insight_sources(
    circle_id: uuid.UUID,
    insight_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_ai_insight_sources(
            requester_id=current_user.id,
            family_id=circle_id,
            insight_id=insight_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/notifications", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    circle_id: uuid.UUID,
    payload: NotificationCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_notification(
            requester_id=current_user.id,
            recipient_profile_id=payload.recipient_profile_id,
            family_id=circle_id,
            type=payload.type,
            priority=payload.priority,
            title=payload.title,
            body=payload.body,
            subject_id=payload.subject_id,
            action_type=payload.action_type,
            action_payload=payload.action_payload,
            source_event_id=payload.source_event_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/notifications/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    circle_id: uuid.UUID,
    notification_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.mark_notification_read(
            requester_id=current_user.id,
            family_id=circle_id,
            notification_id=notification_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/notifications/{notification_id}/dismiss", response_model=NotificationResponse)
async def mark_notification_dismissed(
    circle_id: uuid.UUID,
    notification_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.mark_notification_dismissed(
            requester_id=current_user.id,
            family_id=circle_id,
            notification_id=notification_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/recipients/{recipient_id}/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    circle_id: uuid.UUID,
    recipient_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_notifications(
            requester_id=current_user.id,
            family_id=circle_id,
            recipient_profile_id=recipient_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/notifications/{notification_id}/deliveries", response_model=NotificationDeliveryResponse, status_code=status.HTTP_201_CREATED)
async def create_notification_delivery(
    circle_id: uuid.UUID,
    notification_id: uuid.UUID,
    payload: NotificationDeliveryCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_notification_delivery(
            requester_id=current_user.id,
            family_id=circle_id,
            notification_id=notification_id,
            channel=payload.channel,
            provider=payload.provider,
            status=payload.status,
            attempt_count=payload.attempt_count,
            provider_message_id=payload.provider_message_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/deliveries/{delivery_id}", response_model=NotificationDeliveryResponse)
async def update_notification_delivery(
    circle_id: uuid.UUID,
    delivery_id: uuid.UUID,
    payload: NotificationDeliveryUpdate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.update_notification_delivery(
            requester_id=current_user.id,
            family_id=circle_id,
            delivery_id=delivery_id,
            status=payload.status,
            attempt_count=payload.attempt_count,
            provider_message_id=payload.provider_message_id,
            sent_at=payload.sent_at,
            delivered_at=payload.delivered_at,
            failed_at=payload.failed_at,
            failure_reason=payload.failure_reason
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/notifications/{notification_id}/deliveries", response_model=List[NotificationDeliveryResponse])
async def list_notification_deliveries(
    circle_id: uuid.UUID,
    notification_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_notification_deliveries(
            requester_id=current_user.id,
            family_id=circle_id,
            notification_id=notification_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/conversations", response_model=FamilyConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_family_conversation(
    circle_id: uuid.UUID,
    payload: FamilyConversationCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.create_family_conversation(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=payload.subject_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/conversations", response_model=List[FamilyConversationResponse])
async def list_family_conversations(
    circle_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_family_conversations(
            requester_id=current_user.id,
            family_id=circle_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/conversations/{conversation_id}/messages", response_model=FamilyMessageResponse, status_code=status.HTTP_201_CREATED)
async def create_family_message(
    circle_id: uuid.UUID,
    conversation_id: uuid.UUID,
    payload: FamilyMessageCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_family_message(
            requester_id=current_user.id,
            family_id=circle_id,
            conversation_id=conversation_id,
            message_type=payload.message_type,
            body=payload.body,
            file_id=payload.file_id,
            reply_to_message_id=payload.reply_to_message_id
        )
    except ValueError as e:
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/conversations/{conversation_id}/messages", response_model=List[FamilyMessageResponse])
async def list_family_messages(
    circle_id: uuid.UUID,
    conversation_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_family_messages(
            requester_id=current_user.id,
            family_id=circle_id,
            conversation_id=conversation_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/appointments", response_model=AppointmentCoordinationResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment_coordination(
    circle_id: uuid.UUID,
    payload: AppointmentCoordinationCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_appointment_coordination(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=payload.subject_id,
            fhir_appointment_id=payload.fhir_appointment_id,
            assigned_caregiver_profile_id=payload.assigned_caregiver_profile_id,
            preparation_status=payload.preparation_status,
            summary_status=payload.summary_status,
            reminder_status=payload.reminder_status
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/appointments/{coordination_id}", response_model=AppointmentCoordinationResponse)
async def update_appointment_coordination(
    circle_id: uuid.UUID,
    coordination_id: uuid.UUID,
    payload: AppointmentCoordinationUpdate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.update_appointment_coordination(
            requester_id=current_user.id,
            family_id=circle_id,
            coordination_id=coordination_id,
            assigned_caregiver_profile_id=payload.assigned_caregiver_profile_id,
            preparation_status=payload.preparation_status,
            summary_status=payload.summary_status,
            reminder_status=payload.reminder_status
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/subjects/{subject_id}/appointments", response_model=List[AppointmentCoordinationResponse])
async def list_appointment_coordinations(
    circle_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_appointment_coordinations(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=subject_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/documents", response_model=HealthDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_health_document(
    circle_id: uuid.UUID,
    payload: HealthDocumentCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_health_document(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=payload.subject_id,
            filenest_file_id=payload.filenest_file_id,
            document_type=payload.document_type,
            status=payload.status,
            ai_processing_status=payload.ai_processing_status,
            extraction_status=payload.extraction_status
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/documents/{document_id}", response_model=HealthDocumentResponse)
async def update_health_document(
    circle_id: uuid.UUID,
    document_id: uuid.UUID,
    payload: HealthDocumentUpdate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.update_health_document(
            requester_id=current_user.id,
            family_id=circle_id,
            document_id=document_id,
            status=payload.status,
            ai_processing_status=payload.ai_processing_status,
            extraction_status=payload.extraction_status
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/subjects/{subject_id}/documents", response_model=List[HealthDocumentResponse])
async def list_health_documents(
    circle_id: uuid.UUID,
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_health_documents(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=subject_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/documents/{document_id}/extractions", response_model=DocumentExtractionResponse, status_code=status.HTTP_201_CREATED)
async def create_document_extraction(
    circle_id: uuid.UUID,
    document_id: uuid.UUID,
    payload: DocumentExtractionCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.add_document_extraction(
            requester_id=current_user.id,
            family_id=circle_id,
            document_id=document_id,
            extraction_type=payload.extraction_type,
            raw_output=payload.raw_output,
            normalized_output=payload.normalized_output,
            confidence=payload.confidence,
            review_status=payload.review_status
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/documents/{document_id}/extractions/{extraction_id}/review", response_model=DocumentExtractionResponse)
async def review_document_extraction(
    circle_id: uuid.UUID,
    document_id: uuid.UUID,
    extraction_id: uuid.UUID,
    payload: DocumentExtractionReview,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.review_document_extraction(
            requester_id=current_user.id,
            family_id=circle_id,
            extraction_id=extraction_id,
            review_status=payload.review_status,
            normalized_output=payload.normalized_output
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/documents/{document_id}/extractions", response_model=List[DocumentExtractionResponse])
async def list_document_extractions(
    circle_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_document_extractions(
            requester_id=current_user.id,
            family_id=circle_id,
            document_id=document_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/ai-conversations", response_model=AIConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_conversation(
    circle_id: uuid.UUID,
    payload: AIConversationCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.create_ai_conversation(
            requester_id=current_user.id,
            family_id=circle_id,
            agent_session_id=payload.agent_session_id,
            conversation_type=payload.conversation_type,
            context_scope=payload.context_scope,
            subject_id=payload.subject_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/ai-conversations/{conversation_id}", response_model=AIConversationResponse)
async def get_ai_conversation(
    circle_id: uuid.UUID,
    conversation_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.get_ai_conversation(
            requester_id=current_user.id,
            family_id=circle_id,
            conversation_id=conversation_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/ai-conversations", response_model=List[AIConversationResponse])
async def list_ai_conversations(
    circle_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_ai_conversations(
            requester_id=current_user.id,
            family_id=circle_id
        )
    except DomainError as e:
        raise map_domain_error(e)


@router.post("/circles/{circle_id}/ai-actions", response_model=AIActionResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_action(
    circle_id: uuid.UUID,
    payload: AIActionCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.create_ai_action(
            requester_id=current_user.id,
            family_id=circle_id,
            agent_session_id=payload.agent_session_id,
            action_type=payload.action_type,
            input_data=payload.input_data,
            output_data=payload.output_data,
            requires_approval=payload.requires_approval,
            status=payload.status,
            subject_id=payload.subject_id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DomainError as e:
        raise map_domain_error(e)


@router.put("/circles/{circle_id}/ai-actions/{action_id}/review", response_model=AIActionResponse)
async def review_ai_action(
    circle_id: uuid.UUID,
    action_id: uuid.UUID,
    payload: AIActionReview,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.review_ai_action(
            requester_id=current_user.id,
            family_id=circle_id,
            action_id=action_id,
            status=payload.status
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except DomainError as e:
        raise map_domain_error(e)


@router.get("/circles/{circle_id}/ai-actions", response_model=List[AIActionResponse])
async def list_ai_actions(
    circle_id: uuid.UUID,
    subject_id: Optional[uuid.UUID] = None,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    service = get_family_service(db_session)
    try:
        return await service.list_ai_actions(
            requester_id=current_user.id,
            family_id=circle_id,
            subject_id=subject_id
        )
    except DomainError as e:
        raise map_domain_error(e)
