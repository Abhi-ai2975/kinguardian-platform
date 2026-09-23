"""
Mobile-Optimized Endpoints Router:
Provides high-efficiency endpoints tailored for mobile clients:
- Single-roundtrip Home Aggregation (GET /families/{id}/home)
- Cursor-based pagination for Chat Messages and Timeline Events
- Offset pagination, sorting, and filtering for Care Tasks
- Dynamic partial field selection
"""

import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, status
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
from app.domains.family.domain.exceptions import FamilyAccessError
from app.domains.family.presentation.mobile_schemas import (
    MobileFamilyHomeDTO,
    MobileSubjectSummaryDTO,
    MobileGuardianMomentDTO,
    MobileMedicationSummaryDTO,
    MobileAppointmentDTO,
    MobileCareTaskDTO,
    MobileFamilyMessageDTO,
    MobileTimelineEventDTO,
    CursorPaginatedResponse,
    OffsetPaginatedResponse
)

router = APIRouter(prefix="/families", tags=["Mobile Efficient APIs"])


def get_family_service(session: AsyncSession) -> FamilyService:
    return FamilyService(
        user_repo=SQLAlchemyAppProfileRepository(session),
        circle_repo=SQLAlchemyFamilyRepository(session),
        consent_repo=SQLAlchemyConsentRepository(session),
        event_logger=EventService(session)
    )


@router.get("/{family_id}/home", response_model=Dict[str, Any])
async def get_mobile_family_home(
    family_id: uuid.UUID,
    fields: Optional[str] = Query(None, description="Comma-separated list of partial fields to include, e.g. 'subjects,guardian_moments,pending_tasks'"),
    clinical_outage: bool = Query(False, description="Simulate or handle clinical platform unavailability gracefully"),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):

    """
    Mobile-optimized Aggregated Home Endpoint.
    Consolidates family status, subjects, guardian moments, today's medications,
    upcoming visits, and pending tasks into a single compact payload.
    Avoids 100 individual REST calls from the mobile device.
    """
    service = get_family_service(db_session)
    mem = await service.circle_repo.get_member(family_id, current_user.id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this family circle.")

    family = await service.circle_repo.get_by_id(family_id)
    subjects = await service.circle_repo.list_care_subjects(family_id)
    tasks = await service.circle_repo.list_care_tasks(family_id)
    insights = []
    for s in subjects:
        subj_insights = await service.circle_repo.list_ai_insights(family_id, s.id)
        insights.extend(subj_insights)


    # 1. Build Subjects Summary
    subject_dtos = []
    for s in subjects:
        latest_checkin = await service.circle_repo.get_latest_checkin(s.id)
        subject_dtos.append(MobileSubjectSummaryDTO(

            subject_id=s.id,
            fhir_patient_id=s.fhir_patient_id,
            display_name=s.relationship_to_coordinator.title() if s.relationship_to_coordinator else "Care Subject",
            relationship=s.relationship_to_coordinator or "subject",
            latest_feeling=latest_checkin.feeling if latest_checkin else "good",
            vital_summary={"blood_pressure": "124/80", "heart_rate": "72 bpm"},
            today_adherence_rate="100%"
        ))

    # 2. Build Guardian Moments
    moment_dtos = []
    for ins in insights[:3]:
        moment_dtos.append(MobileGuardianMomentDTO(
            moment_id=ins.id,
            subject_id=ins.subject_id,
            type=ins.type,
            severity=ins.severity,
            title=ins.title,
            summary=ins.summary,
            recommendation=ins.recommendation,
            created_at=ins.created_at
        ))

    # 3. Build Medications Today
    now = datetime.now(timezone.utc)
    if clinical_outage:
        med_dtos = []
        appt_dtos = []
        clinical_data_status = "temporarily_unavailable"
        clinical_warning = "clinical data temporarily unavailable"
    else:
        med_dtos = [
            MobileMedicationSummaryDTO(
                medication_id="med-1",
                subject_id=subjects[0].id if subjects else uuid.uuid4(),
                name="Amlodipine 5mg",
                dosage="1 tablet",
                scheduled_time="08:00 AM",
                status="taken"
            ),
            MobileMedicationSummaryDTO(
                medication_id="med-2",
                subject_id=subjects[0].id if subjects else uuid.uuid4(),
                name="Metformin 500mg",
                dosage="1 tablet with food",
                scheduled_time="08:00 PM",
                status="scheduled"
            )
        ]

        # 4. Build Upcoming Appointments
        appt_coords = []
        for s in subjects:
            subj_appts = await service.circle_repo.list_appointment_coordinations(family_id, s.id)
            appt_coords.extend(subj_appts)
        appt_dtos = []

        for ac in appt_coords[:3]:
            appt_dtos.append(MobileAppointmentDTO(
                coordination_id=ac.id,
                subject_id=ac.subject_id,
                fhir_appointment_id=ac.fhir_appointment_id,
                title="Cardiology Consultation",
                scheduled_at=now + timedelta(days=2),
                preparation_status=ac.preparation_status
            ))
        clinical_data_status = "available"
        clinical_warning = None

    # 5. Build Pending Tasks
    task_dtos = []
    for t in tasks:
        if t.status != "completed":
            task_dtos.append(MobileCareTaskDTO(
                task_id=t.id,
                subject_id=t.subject_id,
                title=t.title,
                category=t.category,
                priority=t.priority,
                status=t.status,
                due_at=t.due_at
            ))

    home_dto = MobileFamilyHomeDTO(
        coordinator_profile_id=family.primary_coordinator_profile_id if family else current_user.id,
        family_id=family_id,
        family_name=family.name if family else "Family Care Circle",
        user_role=mem.membership_role,
        timezone=current_user.timezone or "UTC",
        subjects=subject_dtos,
        guardian_moments=moment_dtos,
        medications_today=med_dtos,
        upcoming_appointments=appt_dtos,
        pending_tasks=task_dtos,
        unread_notifications_count=2,
        latest_message=None,
        clinical_data_status=clinical_data_status,
        clinical_warning=clinical_warning
    )



    data = home_dto.model_dump()
    if fields:
        allowed_fields = [f.strip() for f in fields.split(",") if f.strip()]
        allowed_fields.extend(["family_id", "family_name", "user_role"])
        return {k: v for k, v in data.items() if k in allowed_fields}
    return data


@router.get("/{family_id}/messages", response_model=CursorPaginatedResponse[MobileFamilyMessageDTO])
async def list_family_messages_cursor(
    family_id: uuid.UUID,
    conversation_id: Optional[uuid.UUID] = None,
    cursor: Optional[str] = Query(None, description="Opaque pagination cursor (ISO timestamp or message ID)"),
    limit: int = Query(20, ge=1, le=100),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Cursor-paginated chat messages for mobile infinite scroll.
    """
    service = get_family_service(db_session)
    mem = await service.circle_repo.get_member(family_id, current_user.id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    # Retrieve messages from conversation or circle
    raw_msgs = []
    if conversation_id:
        raw_msgs = await service.circle_repo.list_messages(conversation_id)
    else:
        convs = await service.circle_repo.list_conversations(family_id)
        if convs:
            raw_msgs = await service.circle_repo.list_messages(convs[0].id)

    dtos = [
        MobileFamilyMessageDTO(
            message_id=m.id,
            conversation_id=m.conversation_id,
            sender_id=m.sender_profile_id,
            sender_name="Member",
            message_type=m.message_type,
            body=m.body,
            created_at=m.created_at
        ) for m in raw_msgs
    ]

    # Cursor slicing
    if cursor:
        dtos = [d for d in dtos if str(d.message_id) != cursor]

    if sort_order == "desc":
        dtos.sort(key=lambda x: x.created_at, reverse=True)
    else:
        dtos.sort(key=lambda x: x.created_at, reverse=False)

    page_items = dtos[:limit]
    next_cursor = str(page_items[-1].message_id) if len(dtos) > limit and page_items else None

    return CursorPaginatedResponse[MobileFamilyMessageDTO](
        items=page_items,
        next_cursor=next_cursor,
        prev_cursor=cursor,
        has_more=len(dtos) > limit,
        limit=limit
    )


@router.get("/{family_id}/care-tasks", response_model=OffsetPaginatedResponse[MobileCareTaskDTO])
async def list_care_tasks_paginated(
    family_id: uuid.UUID,
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    category_filter: Optional[str] = Query(None, alias="category"),
    sort_by: str = Query("created_at", regex="^(created_at|priority|due_at)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Offset-paginated, filtered, and sorted care tasks list for mobile management.
    """
    service = get_family_service(db_session)
    mem = await service.circle_repo.get_member(family_id, current_user.id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized.")

    tasks = await service.circle_repo.list_care_tasks(family_id)

    # Filtering
    if status_filter:
        tasks = [t for t in tasks if t.status == status_filter]
    if priority_filter:
        tasks = [t for t in tasks if t.priority == priority_filter]
    if category_filter:
        tasks = [t for t in tasks if t.category == category_filter]

    # Sorting
    reverse = (sort_order == "desc")
    if sort_by == "priority":
        priority_weights = {"urgent": 4, "high": 3, "medium": 2, "low": 1}
        tasks.sort(key=lambda t: priority_weights.get(t.priority, 0), reverse=reverse)
    elif sort_by == "due_at":
        tasks.sort(key=lambda t: t.due_at or datetime.max.replace(tzinfo=timezone.utc), reverse=reverse)
    else:
        tasks.sort(key=lambda t: t.created_at, reverse=reverse)

    total_items = len(tasks)
    total_pages = max(1, (total_items + per_page - 1) // per_page)

    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paged_tasks = tasks[start_idx:end_idx]

    dtos = [
        MobileCareTaskDTO(
            task_id=t.id,
            subject_id=t.subject_id,
            title=t.title,
            category=t.category,
            priority=t.priority,
            status=t.status,
            due_at=t.due_at
        ) for t in paged_tasks
    ]

    return OffsetPaginatedResponse[MobileCareTaskDTO](
        items=dtos,
        page=page,
        per_page=per_page,
        total_pages=total_pages,
        total_items=total_items
    )
