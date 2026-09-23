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
from app.domains.family.application.read_services import ParentHomeReadService
from app.domains.family.schemas import (
    ParentHomeResponse,
    WellbeingCheckinCreate,
    WellbeingCheckinResponse,
    AdherenceEventResponse,
    AIInsightResponse,
    AIInsightDismissRequest,
    AIInsightActRequest,
    AIInsightActResponse,
    HealthDocumentUploadInitRequest,
    HealthDocumentUploadInitResponse,
    HealthDocumentResponse
)
from app.domains.family.presentation.mobile_schemas import (
    SubjectTimelineResponse,
    TimelineItemDTO
)
from datetime import datetime, timezone
from fastapi import Query


from app.domains.clinical.services import ClinicalService
from app.domains.clinical.schemas import (
    MedicationSummaryResponse,
    MedicationReminderResponse,
    AppointmentDetailResponse
)
from app.domains.family.domain.exceptions import FamilyAccessError



router = APIRouter(prefix="/subjects", tags=["Subjects"])



def get_family_service(session: AsyncSession) -> FamilyService:
    user_repo = SQLAlchemyAppProfileRepository(session)
    circle_repo = SQLAlchemyFamilyRepository(session)
    consent_repo = SQLAlchemyConsentRepository(session)
    event_logger = EventService(session)
    return FamilyService(user_repo, circle_repo, consent_repo, event_logger)


@router.get("/{subject_id}/home", response_model=ParentHomeResponse)
async def get_subject_parent_home(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Optimized, intentionally compact read model for the Parent Home screen for a specific Care Subject ID.
    Returns today's check-in status, today's medications, upcoming appointment,
    unread reminders, recent family messages, and pending actions.
    """
    read_service = ParentHomeReadService(db_session)
    try:
        return await read_service.get_parent_home(
            parent_profile_id=current_user.id,
            subject_id=subject_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{subject_id}/check-ins", response_model=WellbeingCheckinResponse, status_code=status.HTTP_201_CREATED)
async def create_subject_checkin(
    subject_id: uuid.UUID,
    payload: WellbeingCheckinCreate,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Submits a daily wellbeing check-in (feeling, notes, voice note, severity) for a care subject.
    """
    service = get_family_service(db_session)
    try:
        return await service.submit_subject_checkin(
            requester_id=current_user.id,
            subject_id=subject_id,
            feeling=payload.feeling,
            notes=payload.notes,
            voice_file_id=payload.voice_file_id,
            severity=payload.severity
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))


@router.get("/{subject_id}/check-ins", response_model=List[WellbeingCheckinResponse])
async def list_subject_checkins(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists historical wellbeing check-ins for a care subject in reverse chronological order.
    """
    service = get_family_service(db_session)
    try:
        return await service.list_subject_checkins(
            requester_id=current_user.id,
            subject_id=subject_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{subject_id}/check-ins/latest", response_model=Optional[WellbeingCheckinResponse])
async def get_latest_subject_checkin(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves the most recent wellbeing check-in submitted for a care subject.
    """
    service = get_family_service(db_session)
    try:
        checkin = await service.get_latest_subject_checkin(
            requester_id=current_user.id,
            subject_id=subject_id
        )
        if not checkin:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No check-ins found for this subject.")
        return checkin
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))



@router.get("/{subject_id}/medications", response_model=List[MedicationSummaryResponse])
async def get_subject_medications(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves the FHIR medication requests for the given subject after resolving permissions.
    """
    service = ClinicalService(db_session)
    return await service.get_subject_medications(
        subject_id=subject_id,
        requester_id=current_user.id
    )


@router.get("/{subject_id}/medication-adherence", response_model=List[AdherenceEventResponse])
async def get_subject_medication_adherence(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves historical medication adherence records for the given care subject.
    """
    service = ClinicalService(db_session)
    return await service.get_subject_adherence_events(
        subject_id=subject_id,
        requester_id=current_user.id
    )


@router.post("/{subject_id}/medications/{medication_id}/take", response_model=AdherenceEventResponse)
async def take_subject_medication(
    subject_id: uuid.UUID,
    medication_id: str,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Records that a subject has taken the specified FHIR medication prescription.
    Resolves the FHIR medication reference before authorizing and logging the action.
    """
    service = ClinicalService(db_session)
    return await service.record_medication_taken(
        subject_id=subject_id,
        medication_id=medication_id,
        requester_id=current_user.id
    )


@router.post("/{subject_id}/medications/{medication_id}/remind", response_model=MedicationReminderResponse)
async def remind_subject_medication(
    subject_id: uuid.UUID,
    medication_id: str,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Triggers a medication reminder for a care subject.
    Resolves the FHIR medication reference before authorizing the reminder.
    """
    service = ClinicalService(db_session)
    return await service.send_medication_reminder(
        subject_id=subject_id,
        medication_id=medication_id,
        requester_id=current_user.id
    )


@router.get("/{subject_id}/appointments", response_model=List[AppointmentDetailResponse])
async def get_subject_appointments(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves the clinical appointments and care coordination tracking for the given care subject.
    """
    service = ClinicalService(db_session)
    return await service.get_subject_appointments(
        subject_id=subject_id,
        requester_id=current_user.id
    )


@router.get("/{subject_id}/insights", response_model=List[AIInsightResponse])
async def list_subject_insights(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists all AI-generated health insights and Guardian Moments for the care subject.
    """
    service = get_family_service(db_session)
    try:
        return await service.list_subject_insights(
            requester_id=current_user.id,
            subject_id=subject_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{subject_id}/insights/{id}/dismiss", response_model=AIInsightResponse)
async def dismiss_subject_insight(
    subject_id: uuid.UUID,
    id: uuid.UUID,
    payload: Optional[AIInsightDismissRequest] = None,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Dismisses an active AI insight for the given care subject.
    """
    service = get_family_service(db_session)
    try:
        return await service.dismiss_subject_insight(
            requester_id=current_user.id,
            subject_id=subject_id,
            insight_id=id,
            reason=payload.reason if payload else None
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{subject_id}/insights/{id}/act", response_model=AIInsightActResponse)
async def act_on_subject_insight(
    subject_id: uuid.UUID,
    id: uuid.UUID,
    payload: Optional[AIInsightActRequest] = None,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Executes an action upon an AI insight (e.g. automatically scheduling a care task or notifying caregivers).
    """
    service = get_family_service(db_session)
    try:
        return await service.act_on_subject_insight(
            requester_id=current_user.id,
            subject_id=subject_id,
            insight_id=id,
            action_type=payload.action_type if payload else "create_care_task",
            custom_notes=payload.custom_notes if payload else None,
            assigned_to_profile_id=payload.assigned_to_profile_id if payload else None
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{subject_id}/documents", response_model=HealthDocumentUploadInitResponse, status_code=status.HTTP_201_CREATED)
async def initiate_document_upload(
    subject_id: uuid.UUID,
    payload: HealthDocumentUploadInitRequest,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Step 1 of FileNest Integration:
    Creates KinGuardian document metadata and initiates secure FileNest upload target.
    """
    service = get_family_service(db_session)
    try:
        return await service.initiate_subject_document_upload(
            requester_id=current_user.id,
            subject_id=subject_id,
            document_type=payload.document_type,
            filename=payload.filename,
            mime_type=payload.mime_type,
            file_size_bytes=payload.file_size_bytes
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{subject_id}/documents", response_model=List[HealthDocumentResponse])
async def list_subject_documents(
    subject_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Lists all uploaded health documents, prescriptions, and lab reports for the given care subject.
    """
    service = get_family_service(db_session)
    try:
        return await service.list_subject_documents(
            requester_id=current_user.id,
            subject_id=subject_id
        )
    except FamilyAccessError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/{subject_id}/timeline", response_model=SubjectTimelineResponse)
async def get_subject_timeline(
    subject_id: uuid.UUID,
    cursor: Optional[str] = Query(None, description="Opaque timestamp cursor for timeline pagination"),
    limit: int = Query(20, ge=1, le=100, description="Number of items to return"),
    type: Optional[str] = Query(None, description="Filter by event type or category (e.g. checkin, medication, care_task, insight, document, appointment)"),
    from_time: Optional[str] = Query(None, alias="from", description="Earliest event timestamp (inclusive)"),
    to_time: Optional[str] = Query(None, alias="to", description="Latest event timestamp (inclusive)"),

    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Retrieves chronological timeline of all care and health events for a specific care subject.
    Uses cursor-based pagination for high performance on long timelines.
    """
    service = get_family_service(db_session)
    subject = await service.circle_repo.get_care_subject(subject_id)
    if not subject:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Care subject not found.")

    mem = await service.circle_repo.get_member(subject.family_id, current_user.id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this care subject's family.")

    timeline_items: List[TimelineItemDTO] = []

    # 1. Wellbeing Check-ins
    checkins = await service.circle_repo.list_checkins_for_subject(subject_id)
    for ci in checkins:
        timeline_items.append(TimelineItemDTO(
            id=str(ci.id),
            event_type="wellbeing_checkin",
            title=f"Wellbeing Check-in: {ci.feeling.title()}",
            summary=ci.notes or f"Reported feeling {ci.feeling}",
            category="checkin",
            occurred_at=ci.submitted_at.replace(tzinfo=timezone.utc) if ci.submitted_at.tzinfo is None else ci.submitted_at,
            metadata={"feeling": ci.feeling, "severity": ci.severity, "voice_file_id": str(ci.voice_file_id) if ci.voice_file_id else None}
        ))

    # 2. Care Tasks
    tasks = await service.circle_repo.list_care_tasks(subject.family_id)
    for t in tasks:
        if t.subject_id == subject_id:
            timeline_items.append(TimelineItemDTO(
                id=str(t.id),
                event_type="care_task",
                title=f"Care Task: {t.title}",
                summary=t.description or f"Category: {t.category}, Priority: {t.priority}",
                category="care_task",
                occurred_at=t.created_at.replace(tzinfo=timezone.utc) if t.created_at.tzinfo is None else t.created_at,
                metadata={"status": t.status, "priority": t.priority, "category": t.category, "due_at": t.due_at.isoformat() if t.due_at else None}
            ))

    # 3. AI Insights / Guardian Moments
    insights = await service.circle_repo.list_ai_insights(subject.family_id, subject_id)
    for ins in insights:
        timeline_items.append(TimelineItemDTO(
            id=str(ins.id),
            event_type="ai_insight" if ins.type != "guardian_moment" else "guardian_moment",
            title=ins.title,
            summary=ins.summary,
            category="insight",
            occurred_at=ins.created_at.replace(tzinfo=timezone.utc) if ins.created_at.tzinfo is None else ins.created_at,
            metadata={"severity": ins.severity, "type": ins.type, "recommendation": ins.recommendation}
        ))

    # 4. Health Documents
    docs = await service.circle_repo.list_health_documents(subject.family_id, subject_id)
    for doc in docs:
        timeline_items.append(TimelineItemDTO(
            id=str(doc.id),
            event_type="health_document",
            title=f"Document: {doc.document_type.replace('_', ' ').title()}",
            summary=f"Status: {doc.status}, Extraction: {doc.extraction_status}",
            category="document",
            occurred_at=doc.created_at.replace(tzinfo=timezone.utc) if doc.created_at.tzinfo is None else doc.created_at,
            metadata={"filenest_file_id": doc.filenest_file_id, "document_type": doc.document_type, "status": doc.status}
        ))

    # 5. Appointments
    appts = await service.circle_repo.list_appointment_coordinations(subject.family_id, subject_id)
    for ac in appts:
        timeline_items.append(TimelineItemDTO(
            id=str(ac.id),
            event_type="appointment",
            title="Appointment Coordination",
            summary=f"Prep Status: {ac.preparation_status}",
            category="appointment",
            occurred_at=ac.created_at.replace(tzinfo=timezone.utc) if ac.created_at.tzinfo is None else ac.created_at,
            metadata={"fhir_appointment_id": ac.fhir_appointment_id, "preparation_status": ac.preparation_status}
        ))

    # 6. Event Logs
    event_logs = await service.event_logger.get_circle_events(subject.family_id)
    for ev in event_logs:
        if ev.payload and ev.payload.get("subject_id") == str(subject_id):
            timeline_items.append(TimelineItemDTO(
                id=str(ev.id),
                event_type=ev.event_type,
                title=ev.event_type.replace("_", " ").title(),
                summary=f"Event logged: {ev.event_type}",
                category="system",
                occurred_at=ev.utc_timestamp.replace(tzinfo=timezone.utc) if ev.utc_timestamp.tzinfo is None else ev.utc_timestamp,
                metadata=ev.payload
            ))

    # Deduplicate items by ID
    seen_ids = set()
    deduped: List[TimelineItemDTO] = []
    for item in timeline_items:
        if item.id not in seen_ids:
            seen_ids.add(item.id)
            deduped.append(item)

    # Filter by type / category
    if type:
        type_lower = type.lower()
        deduped = [it for it in deduped if it.event_type.lower() == type_lower or it.category.lower() == type_lower]

    # Filter by from_time
    if from_time:
        parsed_from = datetime.fromisoformat(from_time.replace(" ", "+"))
        if parsed_from.tzinfo is None:
            parsed_from = parsed_from.replace(tzinfo=timezone.utc)
        deduped = [it for it in deduped if it.occurred_at >= parsed_from]

    # Filter by to_time
    if to_time:
        parsed_to = datetime.fromisoformat(to_time.replace(" ", "+"))
        if parsed_to.tzinfo is None:
            parsed_to = parsed_to.replace(tzinfo=timezone.utc)
        deduped = [it for it in deduped if it.occurred_at <= parsed_to]


    # Sort DESC by occurred_at
    deduped.sort(key=lambda x: x.occurred_at, reverse=True)

    # Cursor filtering
    if cursor:
        try:
            cursor_dt = datetime.fromisoformat(cursor)
            if cursor_dt.tzinfo is None:
                cursor_dt = cursor_dt.replace(tzinfo=timezone.utc)
            deduped = [it for it in deduped if it.occurred_at < cursor_dt]
        except ValueError:
            idx = next((i for i, it in enumerate(deduped) if it.id == cursor), None)
            if idx is not None:
                deduped = deduped[idx + 1:]

    # Pagination slice
    page_items = deduped[:limit]
    next_cursor = None
    if len(deduped) > limit and page_items:
        next_cursor = page_items[-1].occurred_at.isoformat()

    return SubjectTimelineResponse(
        items=page_items,
        next_cursor=next_cursor
    )






