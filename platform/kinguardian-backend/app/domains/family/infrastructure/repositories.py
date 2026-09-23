import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy import select, func

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.domains.family.domain.entities import (
    AppProfileEntity,
    FamilyEntity,
    FamilyMembershipEntity,
    FamilyRelationshipEntity,
    CareSubjectEntity,
    CareRelationshipEntity,
    CareTaskEntity,
    MedicationAdherenceEventEntity,
    WellbeingCheckinEntity,
    MonitoringPreferenceEntity,
    AIInsightSourceEntity,
    AIInsightEntity,
    NotificationEntity,
    NotificationDeliveryEntity,
    FamilyMessageEntity,
    FamilyConversationEntity,
    AppointmentCoordinationEntity,
    HealthDocumentEntity,
    DocumentExtractionEntity,
    AIConversationEntity,
    AIActionEntity,
    ConsentEntity
)
from app.domains.family.domain.interfaces import IAppProfileRepository, IFamilyRepository, IConsentRepository
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    FamilyRelationship,
    CareSubject,
    CareRelationship,
    CareTask,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    MonitoringPreference,
    AIInsight,
    AIInsightSource,
    Notification,
    NotificationDelivery,
    FamilyConversation,
    FamilyMessage,
    AppointmentCoordination,
    HealthDocument,
    DocumentExtraction,
    AIConversation,
    AIAction,
    Consent
)


def _to_profile_entity(profile: AppProfile) -> AppProfileEntity:
    return AppProfileEntity(
        id=profile.id,
        iam_subject_id=profile.iam_subject_id,
        display_name=profile.display_name,
        first_name=profile.first_name,
        last_name=profile.last_name,
        phone=profile.phone,
        email=profile.email,
        date_of_birth=profile.date_of_birth,
        city=profile.city,
        country_code=profile.country_code,
        timezone=profile.timezone,
        preferred_language=profile.preferred_language,
        avatar_file_id=profile.avatar_file_id,
        status=profile.status,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )


def _to_membership_entity(member: FamilyMembership) -> FamilyMembershipEntity:
    profile_entity = None
    if "profile" in member.__dict__ and member.profile:
        profile_entity = _to_profile_entity(member.profile)
        
    return FamilyMembershipEntity(
        id=member.id,
        family_id=member.family_id,
        profile_id=member.profile_id,
        membership_role=member.membership_role,
        status=member.status,
        joined_at=member.joined_at,
        created_at=member.created_at,
        updated_at=member.updated_at,
        profile=profile_entity
    )


def _to_relationship_entity(rel: FamilyRelationship) -> FamilyRelationshipEntity:
    return FamilyRelationshipEntity(
        id=rel.id,
        family_id=rel.family_id,
        from_profile_id=rel.from_profile_id,
        to_profile_id=rel.to_profile_id,
        relationship_type=rel.relationship_type,
        created_at=rel.created_at
    )


def _to_checkin_entity(checkin: WellbeingCheckin) -> WellbeingCheckinEntity:
    return WellbeingCheckinEntity(
        id=checkin.id,
        family_id=checkin.family_id,
        subject_id=checkin.subject_id,
        submitted_by_profile_id=checkin.submitted_by_profile_id,
        feeling=checkin.feeling,
        notes=checkin.notes,
        voice_file_id=checkin.voice_file_id,
        severity=checkin.severity,
        submitted_at=checkin.submitted_at,
        created_at=checkin.created_at
    )


def _to_monitoring_preference_entity(pref: MonitoringPreference) -> MonitoringPreferenceEntity:
    return MonitoringPreferenceEntity(
        id=pref.id,
        family_id=pref.family_id,
        subject_id=pref.subject_id,
        metric=pref.metric,
        baseline_period_days=pref.baseline_period_days,
        threshold_config=pref.threshold_config,
        notification_level=pref.notification_level,
        enabled=pref.enabled,
        created_at=pref.created_at,
        updated_at=pref.updated_at
    )


def _to_ai_insight_source_entity(src: AIInsightSource) -> AIInsightSourceEntity:
    return AIInsightSourceEntity(
        id=src.id,
        insight_id=src.insight_id,
        source_type=src.source_type,
        source_id=src.source_id,
        source_version=src.source_version,
        metadata=src.metadata_json,
        created_at=src.created_at
    )


def _to_ai_insight_entity(insight: AIInsight) -> AIInsightEntity:
    sources = []
    if "sources" in insight.__dict__ and insight.sources:
        sources = [_to_ai_insight_source_entity(s) for s in insight.sources]
        
    return AIInsightEntity(
        id=insight.id,
        family_id=insight.family_id,
        subject_id=insight.subject_id,
        type=insight.type,
        severity=insight.severity,
        title=insight.title,
        summary=insight.summary,
        observation=insight.observation,
        recommendation=insight.recommendation,
        timeframe_start=insight.timeframe_start,
        timeframe_end=insight.timeframe_end,
        confidence=float(insight.confidence) if insight.confidence is not None else None,
        status=insight.status,
        generated_by=insight.generated_by,
        agent_run_id=insight.agent_run_id,
        trigger_type=insight.trigger_type,
        baseline_comparison=insight.baseline_comparison,
        actionability=insight.actionability,
        created_at=insight.created_at,
        updated_at=insight.updated_at,
        sources=sources
    )


def _to_notification_entity(notification: Notification) -> NotificationEntity:
    return NotificationEntity(
        id=notification.id,
        recipient_profile_id=notification.recipient_profile_id,
        family_id=notification.family_id,
        subject_id=notification.subject_id,
        type=notification.type,
        priority=notification.priority,
        title=notification.title,
        body=notification.body,
        action_type=notification.action_type,
        action_payload=notification.action_payload_json,
        source_event_id=notification.source_event_id,
        read_at=notification.read_at,
        dismissed_at=notification.dismissed_at,
        created_at=notification.created_at
    )


def _to_notification_delivery_entity(delivery: NotificationDelivery) -> NotificationDeliveryEntity:
    return NotificationDeliveryEntity(
        id=delivery.id,
        notification_id=delivery.notification_id,
        channel=delivery.channel,
        provider=delivery.provider,
        provider_message_id=delivery.provider_message_id,
        status=delivery.status,
        attempt_count=delivery.attempt_count,
        sent_at=delivery.sent_at,
        delivered_at=delivery.delivered_at,
        failed_at=delivery.failed_at,
        failure_reason=delivery.failure_reason,
        created_at=delivery.created_at,
        updated_at=delivery.updated_at
    )


def _to_family_message_entity(msg: FamilyMessage) -> FamilyMessageEntity:
    return FamilyMessageEntity(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_profile_id=msg.sender_profile_id,
        message_type=msg.message_type,
        body=msg.body,
        file_id=msg.file_id,
        reply_to_message_id=msg.reply_to_message_id,
        created_at=msg.created_at
    )


def _to_family_conversation_entity(conv: FamilyConversation) -> FamilyConversationEntity:
    messages = []
    if "messages" in conv.__dict__ and conv.messages:
        messages = [_to_family_message_entity(m) for m in conv.messages]
        
    return FamilyConversationEntity(
        id=conv.id,
        family_id=conv.family_id,
        subject_id=conv.subject_id,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=messages
    )


def _to_appointment_coordination_entity(coord: AppointmentCoordination) -> AppointmentCoordinationEntity:
    return AppointmentCoordinationEntity(
        id=coord.id,
        family_id=coord.family_id,
        subject_id=coord.subject_id,
        fhir_appointment_id=coord.fhir_appointment_id,
        assigned_caregiver_profile_id=coord.assigned_caregiver_profile_id,
        preparation_status=coord.preparation_status,
        summary_status=coord.summary_status,
        reminder_status=coord.reminder_status,
        created_at=coord.created_at,
        updated_at=coord.updated_at
    )


def _to_health_document_entity(doc: HealthDocument) -> HealthDocumentEntity:
    return HealthDocumentEntity(
        id=doc.id,
        family_id=doc.family_id,
        subject_id=doc.subject_id,
        filenest_file_id=doc.filenest_file_id,
        document_type=doc.document_type,
        status=doc.status,
        source_profile_id=doc.source_profile_id,
        ai_processing_status=doc.ai_processing_status,
        extraction_status=doc.extraction_status,
        created_at=doc.created_at,
        updated_at=doc.updated_at
    )


def _to_document_extraction_entity(ext: DocumentExtraction) -> DocumentExtractionEntity:
    return DocumentExtractionEntity(
        id=ext.id,
        document_id=ext.document_id,
        extraction_type=ext.extraction_type,
        raw_output=ext.raw_output,
        normalized_output=ext.normalized_output,
        confidence=float(ext.confidence) if ext.confidence is not None else None,
        review_status=ext.review_status,
        reviewed_by_profile_id=ext.reviewed_by_profile_id,
        reviewed_at=ext.reviewed_at,
        created_at=ext.created_at,
        updated_at=ext.updated_at
    )


def _to_ai_conversation_entity(conv: AIConversation) -> AIConversationEntity:
    return AIConversationEntity(
        id=conv.id,
        family_id=conv.family_id,
        subject_id=conv.subject_id,
        profile_id=conv.profile_id,
        agent_session_id=conv.agent_session_id,
        conversation_type=conv.conversation_type,
        context_scope=conv.context_scope,
        created_at=conv.created_at,
        updated_at=conv.updated_at
    )


def _to_ai_action_entity(action: AIAction) -> AIActionEntity:
    return AIActionEntity(
        id=action.id,
        family_id=action.family_id,
        subject_id=action.subject_id,
        profile_id=action.profile_id,
        agent_session_id=action.agent_session_id,
        action_type=action.action_type,
        status=action.status,
        input=action.input_json,
        output=action.output_json,
        requires_approval=action.requires_approval,
        approved_by_profile_id=action.approved_by_profile_id,
        approved_at=action.approved_at,
        created_at=action.created_at,
        updated_at=action.updated_at
    )


def _to_care_subject_entity(sub: CareSubject) -> CareSubjectEntity:
    events = []
    if "adherence_events" in sub.__dict__ and sub.adherence_events:
        events = [_to_adherence_event_entity(e) for e in sub.adherence_events]
        
    return CareSubjectEntity(
        id=sub.id,
        family_id=sub.family_id,
        profile_id=sub.profile_id,
        fhir_patient_id=sub.fhir_patient_id,
        relationship_to_coordinator=sub.relationship_to_coordinator,
        city=sub.city,
        country_code=sub.country_code,
        timezone=sub.timezone,
        status=sub.status,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        adherence_events=events
    )


def _to_care_relationship_entity(rel: CareRelationship) -> CareRelationshipEntity:
    return CareRelationshipEntity(
        id=rel.id,
        family_id=rel.family_id,
        subject_id=rel.subject_id,
        profile_id=rel.profile_id,
        relationship_type=rel.relationship_type,
        access_level=rel.access_level,
        status=rel.status,
        starts_at=rel.starts_at,
        created_at=rel.created_at,
        updated_at=rel.updated_at,
        ends_at=rel.ends_at
    )


def _to_care_task_entity(task: CareTask) -> CareTaskEntity:
    return CareTaskEntity(
        id=task.id,
        family_id=task.family_id,
        subject_id=task.subject_id,
        created_by_profile_id=task.created_by_profile_id,
        assigned_to_profile_id=task.assigned_to_profile_id,
        title=task.title,
        description=task.description,
        category=task.category,
        priority=task.priority,
        status=task.status,
        due_at=task.due_at,
        completed_at=task.completed_at,
        completed_by_profile_id=task.completed_by_profile_id,
        source_event_id=task.source_event_id,
        created_at=task.created_at,
        updated_at=task.updated_at
    )


def _to_adherence_event_entity(event: MedicationAdherenceEvent) -> MedicationAdherenceEventEntity:
    return MedicationAdherenceEventEntity(
        id=event.id,
        subject_id=event.subject_id,
        fhir_medication_request_id=event.fhir_medication_request_id,
        scheduled_at=event.scheduled_at,
        confirmed_at=event.confirmed_at,
        status=event.status,
        confirmed_by_profile_id=event.confirmed_by_profile_id,
        source=event.source,
        created_at=event.created_at,
        updated_at=event.updated_at
    )


def _to_family_entity(family: Family) -> FamilyEntity:
    members = []
    if "members" in family.__dict__ and family.members:
        members = [_to_membership_entity(m) for m in family.members]
        
    relationships = []
    if "relationships" in family.__dict__ and family.relationships:
        relationships = [_to_relationship_entity(r) for r in family.relationships]
        
    care_subjects = []
    if "care_subjects" in family.__dict__ and family.care_subjects:
        care_subjects = [_to_care_subject_entity(s) for s in family.care_subjects]
        
    care_relationships = []
    if "care_relationships" in family.__dict__ and family.care_relationships:
        care_relationships = [_to_care_relationship_entity(cr) for cr in family.care_relationships]
        
    care_tasks = []
    if "care_tasks" in family.__dict__ and family.care_tasks:
        care_tasks = [_to_care_task_entity(ct) for ct in family.care_tasks]

    checkins = []
    if "checkins" in family.__dict__ and family.checkins:
        checkins = [_to_checkin_entity(ci) for ci in family.checkins]

    monitoring_preferences = []
    if "monitoring_preferences" in family.__dict__ and family.monitoring_preferences:
        monitoring_preferences = [_to_monitoring_preference_entity(mp) for mp in family.monitoring_preferences]

    ai_insights = []
    if "ai_insights" in family.__dict__ and family.ai_insights:
        ai_insights = [_to_ai_insight_entity(ai) for ai in family.ai_insights]
        
    return FamilyEntity(
        id=family.id,
        name=family.name,
        primary_coordinator_profile_id=family.primary_coordinator_profile_id,
        created_at=family.created_at,
        updated_at=family.updated_at,
        members=members,
        relationships=relationships,
        care_subjects=care_subjects,
        care_relationships=care_relationships,
        care_tasks=care_tasks,
        checkins=checkins,
        monitoring_preferences=monitoring_preferences,
        ai_insights=ai_insights
    )


def _to_consent_entity(consent: Consent) -> ConsentEntity:
    return ConsentEntity(
        id=consent.id,
        family_id=consent.family_id,
        subject_id=consent.subject_id,
        grantor_profile_id=consent.grantor_profile_id,
        grantee_profile_id=consent.grantee_profile_id,
        consent_type=consent.consent_type,
        scope=consent.scope,
        status=consent.status,
        granted_at=consent.granted_at,
        expires_at=consent.expires_at,
        revoked_at=consent.revoked_at,
        version=consent.version,
        created_at=consent.created_at,
        updated_at=consent.updated_at
    )


class SQLAlchemyAppProfileRepository(IAppProfileRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, profile_id: uuid.UUID) -> Optional[AppProfileEntity]:
        result = await self.session.execute(select(AppProfile).where(AppProfile.id == profile_id))
        profile = result.scalar_one_or_none()
        return _to_profile_entity(profile) if profile else None

    async def get_by_email(self, email: str) -> Optional[AppProfileEntity]:
        result = await self.session.execute(select(AppProfile).where(AppProfile.email == email))
        profile = result.scalar_one_or_none()
        return _to_profile_entity(profile) if profile else None

    async def get_by_iam_subject_id(self, iam_subject_id: str) -> Optional[AppProfileEntity]:
        result = await self.session.execute(select(AppProfile).where(AppProfile.iam_subject_id == iam_subject_id))
        profile = result.scalar_one_or_none()
        return _to_profile_entity(profile) if profile else None

    async def create(
        self,
        iam_subject_id: str,
        email: str,
        display_name: Optional[str] = None,
        timezone: str = "UTC"
    ) -> AppProfileEntity:
        profile = AppProfile(
            iam_subject_id=iam_subject_id,
            email=email,
            display_name=display_name,
            timezone=timezone,
            status="active"
        )
        self.session.add(profile)
        await self.session.flush()
        await self.session.refresh(profile)
        return _to_profile_entity(profile)


class SQLAlchemyFamilyRepository(IFamilyRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, family_id: uuid.UUID) -> Optional[FamilyEntity]:
        result = await self.session.execute(
            select(Family)
            .where(Family.id == family_id)
            .options(
                selectinload(Family.members).selectinload(FamilyMembership.profile),
                selectinload(Family.relationships),
                selectinload(Family.care_subjects).selectinload(CareSubject.adherence_events),
                selectinload(Family.care_relationships),
                selectinload(Family.care_tasks),
                selectinload(Family.checkins),
                selectinload(Family.monitoring_preferences),
                selectinload(Family.ai_insights).selectinload(AIInsight.sources)
            )
        )
        family = result.scalar_one_or_none()
        return _to_family_entity(family) if family else None

    async def create(self, name: str, primary_coordinator_profile_id: Optional[uuid.UUID] = None) -> FamilyEntity:
        family = Family(name=name, primary_coordinator_profile_id=primary_coordinator_profile_id)
        self.session.add(family)
        await self.session.flush()
        await self.session.refresh(family)
        return _to_family_entity(family)

    async def update(
        self,
        family_id: uuid.UUID,
        name: Optional[str] = None,
        primary_coordinator_profile_id: Optional[uuid.UUID] = None
    ) -> Optional[FamilyEntity]:
        result = await self.session.execute(select(Family).where(Family.id == family_id))
        family = result.scalar_one_or_none()
        if not family:
            return None
        if name is not None:
            family.name = name
        if primary_coordinator_profile_id is not None:
            family.primary_coordinator_profile_id = primary_coordinator_profile_id
        await self.session.flush()
        return await self.get_by_id(family_id)


    async def add_member(self, family_id: uuid.UUID, profile_id: uuid.UUID, membership_role: str) -> FamilyMembershipEntity:
        member = FamilyMembership(family_id=family_id, profile_id=profile_id, membership_role=membership_role, status="active")
        self.session.add(member)
        await self.session.flush()
        await self.session.refresh(member)
        
        result = await self.session.execute(
            select(FamilyMembership)
            .where(FamilyMembership.id == member.id)
            .options(selectinload(FamilyMembership.profile))
        )
        loaded = result.scalar_one()
        return _to_membership_entity(loaded)

    async def remove_member(self, family_id: uuid.UUID, profile_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            select(FamilyMembership).where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.profile_id == profile_id
            )
        )
        member = result.scalar_one_or_none()
        if member:
            await self.session.delete(member)
            return True
        return False

    async def remove_member_by_id(self, family_id: uuid.UUID, member_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            select(FamilyMembership).where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.id == member_id
            )
        )
        member = result.scalar_one_or_none()
        if member:
            await self.session.delete(member)
            return True
        return False

    async def get_member(self, family_id: uuid.UUID, profile_id: uuid.UUID) -> Optional[FamilyMembershipEntity]:
        result = await self.session.execute(
            select(FamilyMembership)
            .where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.profile_id == profile_id
            )
            .options(selectinload(FamilyMembership.profile))
        )
        member = result.scalar_one_or_none()
        return _to_membership_entity(member) if member else None

    async def get_member_by_id(self, family_id: uuid.UUID, member_id: uuid.UUID) -> Optional[FamilyMembershipEntity]:
        result = await self.session.execute(
            select(FamilyMembership)
            .where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.id == member_id
            )
            .options(selectinload(FamilyMembership.profile))
        )
        member = result.scalar_one_or_none()
        return _to_membership_entity(member) if member else None

    async def list_members(self, family_id: uuid.UUID) -> List[FamilyMembershipEntity]:
        result = await self.session.execute(
            select(FamilyMembership)
            .where(FamilyMembership.family_id == family_id)
            .options(selectinload(FamilyMembership.profile))
        )
        members = result.scalars().all()
        return [_to_membership_entity(m) for m in members]

    async def update_member(
        self,
        family_id: uuid.UUID,
        member_id: uuid.UUID,
        membership_role: Optional[str] = None,
        status: Optional[str] = None
    ) -> Optional[FamilyMembershipEntity]:
        result = await self.session.execute(
            select(FamilyMembership).where(
                FamilyMembership.family_id == family_id,
                FamilyMembership.id == member_id
            )
        )
        member = result.scalar_one_or_none()
        if not member:
            return None
        if membership_role is not None:
            member.membership_role = membership_role
        if status is not None:
            member.status = status
        await self.session.flush()
        return await self.get_member_by_id(family_id, member_id)


    async def list_for_user(self, profile_id: uuid.UUID) -> List[FamilyEntity]:
        result = await self.session.execute(
            select(Family)
            .join(FamilyMembership)
            .where(FamilyMembership.profile_id == profile_id)
            .options(
                selectinload(Family.members).selectinload(FamilyMembership.profile),
                selectinload(Family.relationships),
                selectinload(Family.care_subjects).selectinload(CareSubject.adherence_events),
                selectinload(Family.care_relationships),
                selectinload(Family.care_tasks),
                selectinload(Family.checkins),
                selectinload(Family.monitoring_preferences),
                selectinload(Family.ai_insights).selectinload(AIInsight.sources)
            )
        )
        return [_to_family_entity(f) for f in result.scalars().all()]

    async def add_relationship(
        self,
        family_id: uuid.UUID,
        from_profile_id: uuid.UUID,
        to_profile_id: uuid.UUID,
        relationship_type: str
    ) -> FamilyRelationshipEntity:
        rel = FamilyRelationship(
            family_id=family_id,
            from_profile_id=from_profile_id,
            to_profile_id=to_profile_id,
            relationship_type=relationship_type
        )
        self.session.add(rel)
        await self.session.flush()
        await self.session.refresh(rel)
        return _to_relationship_entity(rel)

    async def list_relationships(self, family_id: uuid.UUID) -> List[FamilyRelationshipEntity]:
        result = await self.session.execute(
            select(FamilyRelationship)
            .where(FamilyRelationship.family_id == family_id)
        )
        return [_to_relationship_entity(r) for r in result.scalars().all()]

    async def add_care_subject(
        self,
        family_id: uuid.UUID,
        fhir_patient_id: str,
        profile_id: Optional[uuid.UUID] = None,
        relationship_to_coordinator: Optional[str] = None,
        city: Optional[str] = None,
        country_code: Optional[str] = None,
        timezone: Optional[str] = None
    ) -> CareSubjectEntity:
        sub = CareSubject(
            family_id=family_id,
            fhir_patient_id=fhir_patient_id,
            profile_id=profile_id,
            relationship_to_coordinator=relationship_to_coordinator,
            city=city,
            country_code=country_code,
            timezone=timezone,
            status="active"
        )
        self.session.add(sub)
        await self.session.flush()
        await self.session.refresh(sub)
        return _to_care_subject_entity(sub)

    async def list_care_subjects(self, family_id: uuid.UUID) -> List[CareSubjectEntity]:
        result = await self.session.execute(
            select(CareSubject)
            .where(CareSubject.family_id == family_id)
            .options(selectinload(CareSubject.adherence_events))
        )
        return [_to_care_subject_entity(s) for s in result.scalars().all()]

    async def get_care_subject(self, subject_id: uuid.UUID) -> Optional[CareSubjectEntity]:
        result = await self.session.execute(
            select(CareSubject)
            .where(CareSubject.id == subject_id)
            .options(selectinload(CareSubject.adherence_events))
        )
        sub = result.scalar_one_or_none()
        return _to_care_subject_entity(sub) if sub else None


    async def add_care_relationship(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        profile_id: uuid.UUID,
        relationship_type: str,
        access_level: Optional[str] = None,
        starts_at: Optional[datetime] = None,
        ends_at: Optional[datetime] = None
    ) -> CareRelationshipEntity:
        rel = CareRelationship(
            family_id=family_id,
            subject_id=subject_id,
            profile_id=profile_id,
            relationship_type=relationship_type,
            access_level=access_level,
            starts_at=starts_at or datetime.now(),
            ends_at=ends_at,
            status="active"
        )
        self.session.add(rel)
        await self.session.flush()
        await self.session.refresh(rel)
        return _to_care_relationship_entity(rel)

    async def list_care_relationships(self, family_id: uuid.UUID) -> List[CareRelationshipEntity]:
        result = await self.session.execute(
            select(CareRelationship)
            .where(CareRelationship.family_id == family_id)
        )
        return [_to_care_relationship_entity(r) for r in result.scalars().all()]

    async def get_care_relationship(self, family_id: uuid.UUID, relationship_id: uuid.UUID) -> Optional[CareRelationshipEntity]:
        result = await self.session.execute(
            select(CareRelationship)
            .where(
                CareRelationship.family_id == family_id,
                CareRelationship.id == relationship_id
            )
        )
        rel = result.scalar_one_or_none()
        return _to_care_relationship_entity(rel) if rel else None

    async def update_care_relationship(
        self,
        family_id: uuid.UUID,
        relationship_id: uuid.UUID,
        relationship_type: Optional[str] = None,
        access_level: Optional[str] = None,
        status: Optional[str] = None,
        ends_at: Optional[datetime] = None
    ) -> Optional[CareRelationshipEntity]:
        result = await self.session.execute(
            select(CareRelationship)
            .where(
                CareRelationship.family_id == family_id,
                CareRelationship.id == relationship_id
            )
        )
        rel = result.scalar_one_or_none()
        if not rel:
            return None
        if relationship_type is not None:
            rel.relationship_type = relationship_type
        if access_level is not None:
            rel.access_level = access_level
        if status is not None:
            rel.status = status
        if ends_at is not None:
            rel.ends_at = ends_at
        await self.session.flush()
        return await self.get_care_relationship(family_id, relationship_id)

    async def remove_care_relationship(self, family_id: uuid.UUID, relationship_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            select(CareRelationship)
            .where(
                CareRelationship.family_id == family_id,
                CareRelationship.id == relationship_id
            )
        )
        rel = result.scalar_one_or_none()
        if rel:
            await self.session.delete(rel)
            return True
        return False


    async def add_care_task(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        created_by_profile_id: uuid.UUID,
        assigned_to_profile_id: uuid.UUID,
        title: str,
        description: Optional[str],
        category: str,
        priority: str,
        due_at: datetime,
        source_event_id: Optional[uuid.UUID] = None
    ) -> CareTaskEntity:
        task = CareTask(
            family_id=family_id,
            subject_id=subject_id,
            created_by_profile_id=created_by_profile_id,
            assigned_to_profile_id=assigned_to_profile_id,
            title=title,
            description=description,
            category=category,
            priority=priority,
            due_at=due_at,
            status="pending",
            source_event_id=source_event_id
        )
        self.session.add(task)
        await self.session.flush()
        await self.session.refresh(task)
        return _to_care_task_entity(task)

    async def get_care_task(self, task_id: uuid.UUID) -> Optional[CareTaskEntity]:
        result = await self.session.execute(
            select(CareTask).where(CareTask.id == task_id)
        )
        task = result.scalar_one_or_none()
        return _to_care_task_entity(task) if task else None

    async def update_care_task(
        self,
        task_id: uuid.UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        due_at: Optional[datetime] = None,
        status: Optional[str] = None,
        assigned_to_profile_id: Optional[uuid.UUID] = None,
        completed_at: Optional[datetime] = None,
        completed_by_profile_id: Optional[uuid.UUID] = None
    ) -> Optional[CareTaskEntity]:
        result = await self.session.execute(
            select(CareTask).where(CareTask.id == task_id)
        )
        task = result.scalar_one_or_none()
        if task:
            if title is not None:
                task.title = title
            if description is not None:
                task.description = description
            if category is not None:
                task.category = category
            if priority is not None:
                task.priority = priority
            if due_at is not None:
                task.due_at = due_at
            if status is not None:
                task.status = status
            if assigned_to_profile_id is not None:
                task.assigned_to_profile_id = assigned_to_profile_id
            if completed_at is not None:
                task.completed_at = completed_at
            if completed_by_profile_id is not None:
                task.completed_by_profile_id = completed_by_profile_id
            task.updated_at = datetime.now()
            await self.session.flush()
            await self.session.refresh(task)
            return _to_care_task_entity(task)
        return None


    async def list_care_tasks(self, family_id: uuid.UUID, subject_id: Optional[uuid.UUID] = None) -> List[CareTaskEntity]:
        stmt = select(CareTask).where(CareTask.family_id == family_id)
        if subject_id is not None:
            stmt = stmt.where(CareTask.subject_id == subject_id)
        stmt = stmt.order_by(CareTask.due_at.asc())
        result = await self.session.execute(stmt)
        return [_to_care_task_entity(t) for t in result.scalars().all()]


    async def add_adherence_event(
        self,
        subject_id: uuid.UUID,
        fhir_medication_request_id: str,
        scheduled_at: datetime,
        status: str,
        confirmed_at: Optional[datetime] = None,
        confirmed_by_profile_id: Optional[uuid.UUID] = None,
        source: str = "caregiver"
    ) -> MedicationAdherenceEventEntity:
        event = MedicationAdherenceEvent(
            subject_id=subject_id,
            fhir_medication_request_id=fhir_medication_request_id,
            scheduled_at=scheduled_at,
            status=status,
            confirmed_at=confirmed_at,
            confirmed_by_profile_id=confirmed_by_profile_id,
            source=source
        )
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return _to_adherence_event_entity(event)

    async def list_adherence_events(self, subject_id: uuid.UUID, since: Optional[datetime] = None) -> List[MedicationAdherenceEventEntity]:
        stmt = select(MedicationAdherenceEvent).where(MedicationAdherenceEvent.subject_id == subject_id)
        if since is not None:
            stmt = stmt.where(MedicationAdherenceEvent.scheduled_at >= since)
        stmt = stmt.order_by(MedicationAdherenceEvent.scheduled_at.asc())
        result = await self.session.execute(stmt)
        return [_to_adherence_event_entity(e) for e in result.scalars().all()]


    async def add_checkin(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        submitted_by_profile_id: uuid.UUID,
        feeling: str,
        notes: Optional[str],
        voice_file_id: Optional[uuid.UUID],
        severity: str,
        submitted_at: Optional[datetime] = None
    ) -> WellbeingCheckinEntity:
        checkin = WellbeingCheckin(
            family_id=family_id,
            subject_id=subject_id,
            submitted_by_profile_id=submitted_by_profile_id,
            feeling=feeling,
            notes=notes,
            voice_file_id=voice_file_id,
            severity=severity,
            submitted_at=submitted_at or datetime.now()
        )
        self.session.add(checkin)
        await self.session.flush()
        await self.session.refresh(checkin)
        return _to_checkin_entity(checkin)

    async def list_checkins(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[WellbeingCheckinEntity]:
        result = await self.session.execute(
            select(WellbeingCheckin)
            .where(
                WellbeingCheckin.family_id == family_id,
                WellbeingCheckin.subject_id == subject_id
            )
            .order_by(WellbeingCheckin.submitted_at.desc())
        )
        return [_to_checkin_entity(ci) for ci in result.scalars().all()]

    async def list_checkins_for_subject(self, subject_id: uuid.UUID) -> List[WellbeingCheckinEntity]:
        result = await self.session.execute(
            select(WellbeingCheckin)
            .where(WellbeingCheckin.subject_id == subject_id)
            .order_by(WellbeingCheckin.submitted_at.desc())
        )
        return [_to_checkin_entity(ci) for ci in result.scalars().all()]

    async def get_latest_checkin(self, subject_id: uuid.UUID) -> Optional[WellbeingCheckinEntity]:
        result = await self.session.execute(
            select(WellbeingCheckin)
            .where(WellbeingCheckin.subject_id == subject_id)
            .order_by(WellbeingCheckin.submitted_at.desc())
            .limit(1)
        )
        checkin = result.scalar_one_or_none()
        return _to_checkin_entity(checkin) if checkin else None


    async def add_monitoring_preference(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        metric: str,
        baseline_period_days: int,
        threshold_config: dict,
        notification_level: str,
        enabled: bool
    ) -> MonitoringPreferenceEntity:
        pref = MonitoringPreference(
            family_id=family_id,
            subject_id=subject_id,
            metric=metric,
            baseline_period_days=baseline_period_days,
            threshold_config=threshold_config,
            notification_level=notification_level,
            enabled=enabled
        )
        self.session.add(pref)
        await self.session.flush()
        await self.session.refresh(pref)
        return _to_monitoring_preference_entity(pref)

    async def update_monitoring_preference(
        self,
        preference_id: uuid.UUID,
        enabled: bool,
        threshold_config: Optional[dict] = None
    ) -> Optional[MonitoringPreferenceEntity]:
        result = await self.session.execute(
            select(MonitoringPreference).where(MonitoringPreference.id == preference_id)
        )
        pref = result.scalar_one_or_none()
        if pref:
            pref.enabled = enabled
            if threshold_config is not None:
                pref.threshold_config = threshold_config
            await self.session.flush()
            await self.session.refresh(pref)
            return _to_monitoring_preference_entity(pref)
        return None

    async def list_monitoring_preferences(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[MonitoringPreferenceEntity]:
        result = await self.session.execute(
            select(MonitoringPreference)
            .where(
                MonitoringPreference.family_id == family_id,
                MonitoringPreference.subject_id == subject_id
            )
            .order_by(MonitoringPreference.metric.asc())
        )
        return [_to_monitoring_preference_entity(p) for p in result.scalars().all()]

    async def add_ai_insight(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        type: str,
        severity: str,
        title: str,
        summary: str,
        observation: str,
        recommendation: Optional[str] = None,
        timeframe_start: Optional[datetime] = None,
        timeframe_end: Optional[datetime] = None,
        confidence: Optional[float] = None,
        status: str = "active",
        generated_by: str = "agent",
        agent_run_id: Optional[str] = None,
        trigger_type: Optional[str] = None,
        baseline_comparison: Optional[str] = None,
        actionability: Optional[str] = None
    ) -> AIInsightEntity:

        insight = AIInsight(
            family_id=uuid.UUID(family_id) if isinstance(family_id, str) else family_id,
            subject_id=uuid.UUID(subject_id) if isinstance(subject_id, str) else subject_id,
            type=type,

            severity=severity,
            title=title,
            summary=summary,
            observation=observation,
            recommendation=recommendation,
            timeframe_start=timeframe_start,
            timeframe_end=timeframe_end,
            confidence=confidence,
            status=status,
            generated_by=generated_by,
            agent_run_id=agent_run_id,
            trigger_type=trigger_type,
            baseline_comparison=baseline_comparison,
            actionability=actionability
        )
        self.session.add(insight)
        await self.session.flush()
        await self.session.refresh(insight)
        
        result = await self.session.execute(
            select(AIInsight).where(AIInsight.id == insight.id).options(selectinload(AIInsight.sources))
        )
        loaded = result.scalar_one()
        return _to_ai_insight_entity(loaded)

    async def get_ai_insight(self, insight_id: uuid.UUID) -> Optional[AIInsightEntity]:
        result = await self.session.execute(
            select(AIInsight).where(AIInsight.id == insight_id).options(selectinload(AIInsight.sources))
        )
        insight = result.scalar_one_or_none()
        return _to_ai_insight_entity(insight) if insight else None

    async def update_ai_insight_status(self, insight_id: uuid.UUID, status: str) -> Optional[AIInsightEntity]:
        result = await self.session.execute(
            select(AIInsight).where(AIInsight.id == insight_id).options(selectinload(AIInsight.sources))
        )
        insight = result.scalar_one_or_none()
        if insight:
            insight.status = status
            await self.session.flush()
            await self.session.refresh(insight)
            return _to_ai_insight_entity(insight)
        return None

    async def list_ai_insights(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[AIInsightEntity]:
        result = await self.session.execute(
            select(AIInsight)
            .where(
                AIInsight.family_id == family_id,
                AIInsight.subject_id == subject_id
            )
            .options(selectinload(AIInsight.sources))
            .order_by(AIInsight.created_at.desc())
        )
        return [_to_ai_insight_entity(ai) for ai in result.scalars().all()]

    async def list_ai_insights_for_subject(self, subject_id: uuid.UUID) -> List[AIInsightEntity]:
        result = await self.session.execute(
            select(AIInsight)
            .where(AIInsight.subject_id == subject_id)
            .options(selectinload(AIInsight.sources))
            .order_by(AIInsight.created_at.desc())
        )
        return [_to_ai_insight_entity(ai) for ai in result.scalars().all()]


    async def add_ai_insight_source(
        self,
        insight_id: uuid.UUID,
        source_type: str,
        source_id: str,
        source_version: Optional[str],
        metadata: dict
    ) -> AIInsightSourceEntity:
        src = AIInsightSource(
            insight_id=insight_id,
            source_type=source_type,
            source_id=source_id,
            source_version=source_version,
            metadata_json=metadata
        )
        self.session.add(src)
        await self.session.flush()
        await self.session.refresh(src)
        return _to_ai_insight_source_entity(src)

    async def list_ai_insight_sources(self, insight_id: uuid.UUID) -> List[AIInsightSourceEntity]:
        result = await self.session.execute(
            select(AIInsightSource)
            .where(AIInsightSource.insight_id == insight_id)
            .order_by(AIInsightSource.created_at.desc())
        )
        return [_to_ai_insight_source_entity(s) for s in result.scalars().all()]

    async def add_notification(
        self,
        recipient_profile_id: uuid.UUID,
        family_id: uuid.UUID,
        type: str,
        priority: str,
        title: str,
        body: str,
        subject_id: Optional[uuid.UUID] = None,
        action_type: Optional[str] = None,
        action_payload: Optional[dict] = None,
        source_event_id: Optional[uuid.UUID] = None
    ) -> NotificationEntity:
        notification = Notification(
            recipient_profile_id=recipient_profile_id,
            family_id=family_id,
            type=type,
            priority=priority,
            title=title,
            body=body,
            subject_id=subject_id,
            action_type=action_type,
            action_payload_json=action_payload or {},
            source_event_id=source_event_id
        )
        self.session.add(notification)
        await self.session.flush()
        await self.session.refresh(notification)
        return _to_notification_entity(notification)

    async def get_notification(self, notification_id: uuid.UUID) -> Optional[NotificationEntity]:
        result = await self.session.execute(select(Notification).where(Notification.id == notification_id))
        notification = result.scalar_one_or_none()
        return _to_notification_entity(notification) if notification else None

    async def update_notification_read(self, notification_id: uuid.UUID, read_at: Optional[datetime]) -> Optional[NotificationEntity]:

        result = await self.session.execute(select(Notification).where(Notification.id == notification_id))
        notification = result.scalar_one_or_none()
        if notification:
            notification.read_at = read_at
            await self.session.flush()
            await self.session.refresh(notification)
            return _to_notification_entity(notification)
        return None

    async def update_notification_dismissed(self, notification_id: uuid.UUID, dismissed_at: Optional[datetime]) -> Optional[NotificationEntity]:
        result = await self.session.execute(select(Notification).where(Notification.id == notification_id))
        notification = result.scalar_one_or_none()
        if notification:
            notification.dismissed_at = dismissed_at
            await self.session.flush()
            await self.session.refresh(notification)
            return _to_notification_entity(notification)
        return None

    async def list_notifications(
        self,
        recipient_profile_id: uuid.UUID,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[NotificationEntity]:
        stmt = select(Notification).where(Notification.recipient_profile_id == recipient_profile_id)
        if unread_only:
            stmt = stmt.where(Notification.read_at.is_(None))
        stmt = stmt.order_by(Notification.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return [_to_notification_entity(n) for n in result.scalars().all()]


    async def add_notification_delivery(
        self,
        notification_id: uuid.UUID,
        channel: str,
        provider: str,
        status: str = "pending",
        attempt_count: int = 1,
        provider_message_id: Optional[str] = None
    ) -> NotificationDeliveryEntity:
        delivery = NotificationDelivery(
            notification_id=notification_id,
            channel=channel,
            provider=provider,
            status=status,
            attempt_count=attempt_count,
            provider_message_id=provider_message_id
        )
        self.session.add(delivery)
        await self.session.flush()
        await self.session.refresh(delivery)
        return _to_notification_delivery_entity(delivery)

    async def update_notification_delivery(
        self,
        delivery_id: uuid.UUID,
        status: str,
        attempt_count: Optional[int] = None,
        provider_message_id: Optional[str] = None,
        sent_at: Optional[datetime] = None,
        delivered_at: Optional[datetime] = None,
        failed_at: Optional[datetime] = None,
        failure_reason: Optional[str] = None
    ) -> Optional[NotificationDeliveryEntity]:
        result = await self.session.execute(select(NotificationDelivery).where(NotificationDelivery.id == delivery_id))
        delivery = result.scalar_one_or_none()
        if delivery:
            delivery.status = status
            if attempt_count is not None:
                delivery.attempt_count = attempt_count
            if provider_message_id is not None:
                delivery.provider_message_id = provider_message_id
            if sent_at is not None:
                delivery.sent_at = sent_at
            if delivered_at is not None:
                delivery.delivered_at = delivered_at
            if failed_at is not None:
                delivery.failed_at = failed_at
            if failure_reason is not None:
                delivery.failure_reason = failure_reason
            await self.session.flush()
            await self.session.refresh(delivery)
            return _to_notification_delivery_entity(delivery)
        return None

    async def list_notification_deliveries(self, notification_id: uuid.UUID) -> List[NotificationDeliveryEntity]:
        result = await self.session.execute(
            select(NotificationDelivery)
            .where(NotificationDelivery.notification_id == notification_id)
            .order_by(NotificationDelivery.created_at.desc())
        )
        return [_to_notification_delivery_entity(d) for d in result.scalars().all()]

    async def create_conversation(self, family_id: uuid.UUID, subject_id: Optional[uuid.UUID] = None) -> FamilyConversationEntity:
        conv = FamilyConversation(family_id=family_id, subject_id=subject_id)
        self.session.add(conv)
        await self.session.flush()
        await self.session.refresh(conv)
        return _to_family_conversation_entity(conv)

    async def get_conversation(self, conversation_id: uuid.UUID) -> Optional[FamilyConversationEntity]:
        result = await self.session.execute(
            select(FamilyConversation)
            .where(FamilyConversation.id == conversation_id)
            .options(selectinload(FamilyConversation.messages))
        )
        conv = result.scalar_one_or_none()
        return _to_family_conversation_entity(conv) if conv else None

    async def list_conversations(self, family_id: uuid.UUID) -> List[FamilyConversationEntity]:
        result = await self.session.execute(
            select(FamilyConversation)
            .where(FamilyConversation.family_id == family_id)
            .options(selectinload(FamilyConversation.messages))
            .order_by(FamilyConversation.updated_at.desc())
        )
        return [_to_family_conversation_entity(c) for c in result.scalars().all()]

    async def add_message(
        self,
        conversation_id: uuid.UUID,
        sender_profile_id: uuid.UUID,
        message_type: str,
        body: str,
        file_id: Optional[uuid.UUID] = None,
        reply_to_message_id: Optional[uuid.UUID] = None
    ) -> FamilyMessageEntity:
        msg = FamilyMessage(
            conversation_id=conversation_id,
            sender_profile_id=sender_profile_id,
            message_type=message_type,
            body=body,
            file_id=file_id,
            reply_to_message_id=reply_to_message_id
        )
        self.session.add(msg)
        
        # update parent conversation timestamp
        result = await self.session.execute(
            select(FamilyConversation).where(FamilyConversation.id == conversation_id)
        )
        conv = result.scalar_one_or_none()
        if conv:
            conv.updated_at = datetime.now()
            
        await self.session.flush()
        await self.session.refresh(msg)
        return _to_family_message_entity(msg)

    async def list_messages(self, conversation_id: uuid.UUID) -> List[FamilyMessageEntity]:
        result = await self.session.execute(
            select(FamilyMessage)
            .where(FamilyMessage.conversation_id == conversation_id)
            .order_by(FamilyMessage.created_at.asc())
        )
        return [_to_family_message_entity(m) for m in result.scalars().all()]

    async def add_appointment_coordination(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        fhir_appointment_id: str,
        assigned_caregiver_profile_id: Optional[uuid.UUID] = None,
        preparation_status: str = "pending",
        summary_status: str = "pending",
        reminder_status: str = "pending"
    ) -> AppointmentCoordinationEntity:
        coord = AppointmentCoordination(
            family_id=family_id,
            subject_id=subject_id,
            fhir_appointment_id=fhir_appointment_id,
            assigned_caregiver_profile_id=assigned_caregiver_profile_id,
            preparation_status=preparation_status,
            summary_status=summary_status,
            reminder_status=reminder_status
        )
        self.session.add(coord)
        await self.session.flush()
        await self.session.refresh(coord)
        return _to_appointment_coordination_entity(coord)

    async def update_appointment_coordination(
        self,
        coordination_id: uuid.UUID,
        assigned_caregiver_profile_id: Optional[uuid.UUID] = None,
        preparation_status: Optional[str] = None,
        summary_status: Optional[str] = None,
        reminder_status: Optional[str] = None
    ) -> Optional[AppointmentCoordinationEntity]:
        result = await self.session.execute(select(AppointmentCoordination).where(AppointmentCoordination.id == coordination_id))
        coord = result.scalar_one_or_none()
        if coord:
            if assigned_caregiver_profile_id is not None:
                coord.assigned_caregiver_profile_id = assigned_caregiver_profile_id
            if preparation_status is not None:
                coord.preparation_status = preparation_status
            if summary_status is not None:
                coord.summary_status = summary_status
            if reminder_status is not None:
                coord.reminder_status = reminder_status
            await self.session.flush()
            await self.session.refresh(coord)
            return _to_appointment_coordination_entity(coord)
        return None

    async def get_appointment_coordination(self, coordination_id: uuid.UUID) -> Optional[AppointmentCoordinationEntity]:
        result = await self.session.execute(select(AppointmentCoordination).where(AppointmentCoordination.id == coordination_id))
        coord = result.scalar_one_or_none()
        return _to_appointment_coordination_entity(coord) if coord else None

    async def get_appointment_coordination_by_fhir_id(self, fhir_appointment_id: str) -> Optional[AppointmentCoordinationEntity]:
        result = await self.session.execute(select(AppointmentCoordination).where(AppointmentCoordination.fhir_appointment_id == fhir_appointment_id))
        coord = result.scalar_one_or_none()
        return _to_appointment_coordination_entity(coord) if coord else None

    async def list_appointment_coordinations(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[AppointmentCoordinationEntity]:
        result = await self.session.execute(
            select(AppointmentCoordination)
            .where(
                AppointmentCoordination.family_id == family_id,
                AppointmentCoordination.subject_id == subject_id
            )
            .order_by(AppointmentCoordination.created_at.desc())
        )
        return [_to_appointment_coordination_entity(c) for c in result.scalars().all()]


    async def add_health_document(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        filenest_file_id: str,
        document_type: str,
        source_profile_id: uuid.UUID,
        status: str = "active",
        ai_processing_status: str = "pending",
        extraction_status: str = "pending"
    ) -> HealthDocumentEntity:
        doc = HealthDocument(
            family_id=family_id,
            subject_id=subject_id,
            filenest_file_id=filenest_file_id,
            document_type=document_type,
            source_profile_id=source_profile_id,
            status=status,
            ai_processing_status=ai_processing_status,
            extraction_status=extraction_status
        )
        self.session.add(doc)
        await self.session.flush()
        await self.session.refresh(doc)
        return _to_health_document_entity(doc)

    async def update_health_document(
        self,
        document_id: uuid.UUID,
        status: Optional[str] = None,
        ai_processing_status: Optional[str] = None,
        extraction_status: Optional[str] = None
    ) -> Optional[HealthDocumentEntity]:
        result = await self.session.execute(select(HealthDocument).where(HealthDocument.id == document_id))
        doc = result.scalar_one_or_none()
        if doc:
            if status is not None:
                doc.status = status
            if ai_processing_status is not None:
                doc.ai_processing_status = ai_processing_status
            if extraction_status is not None:
                doc.extraction_status = extraction_status
            await self.session.flush()
            await self.session.refresh(doc)
            return _to_health_document_entity(doc)
        return None

    async def get_health_document(self, document_id: uuid.UUID) -> Optional[HealthDocumentEntity]:
        result = await self.session.execute(select(HealthDocument).where(HealthDocument.id == document_id))
        doc = result.scalar_one_or_none()
        return _to_health_document_entity(doc) if doc else None

    async def get_health_document_by_filenest_id(self, filenest_file_id: str) -> Optional[HealthDocumentEntity]:
        result = await self.session.execute(select(HealthDocument).where(HealthDocument.filenest_file_id == filenest_file_id))
        doc = result.scalar_one_or_none()
        return _to_health_document_entity(doc) if doc else None

    async def list_health_documents(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[HealthDocumentEntity]:
        result = await self.session.execute(
            select(HealthDocument)
            .where(
                HealthDocument.family_id == family_id,
                HealthDocument.subject_id == subject_id
            )
            .order_by(HealthDocument.created_at.desc())
        )
        return [_to_health_document_entity(d) for d in result.scalars().all()]

    async def list_health_documents_for_subject(self, subject_id: uuid.UUID) -> List[HealthDocumentEntity]:
        result = await self.session.execute(
            select(HealthDocument)
            .where(HealthDocument.subject_id == subject_id)
            .order_by(HealthDocument.created_at.desc())
        )
        return [_to_health_document_entity(d) for d in result.scalars().all()]


    async def add_document_extraction(
        self,
        document_id: uuid.UUID,
        extraction_type: str,
        raw_output: dict,
        normalized_output: dict,
        confidence: Optional[float] = None,
        review_status: str = "pending_review"
    ) -> DocumentExtractionEntity:
        ext = DocumentExtraction(
            document_id=document_id,
            extraction_type=extraction_type,
            raw_output=raw_output,
            normalized_output=normalized_output,
            confidence=confidence,
            review_status=review_status
        )
        self.session.add(ext)
        await self.session.flush()
        await self.session.refresh(ext)
        return _to_document_extraction_entity(ext)

    async def review_document_extraction(
        self,
        extraction_id: uuid.UUID,
        review_status: str,
        reviewed_by_profile_id: uuid.UUID,
        reviewed_at: datetime,
        normalized_output: Optional[dict] = None
    ) -> Optional[DocumentExtractionEntity]:
        result = await self.session.execute(select(DocumentExtraction).where(DocumentExtraction.id == extraction_id))
        ext = result.scalar_one_or_none()
        if ext:
            ext.review_status = review_status
            ext.reviewed_by_profile_id = reviewed_by_profile_id
            ext.reviewed_at = reviewed_at
            if normalized_output is not None:
                ext.normalized_output = normalized_output
            await self.session.flush()
            await self.session.refresh(ext)
            return _to_document_extraction_entity(ext)
        return None

    async def list_document_extractions(self, document_id: uuid.UUID) -> List[DocumentExtractionEntity]:
        result = await self.session.execute(
            select(DocumentExtraction)
            .where(DocumentExtraction.document_id == document_id)
            .order_by(DocumentExtraction.created_at.desc())
        )
        return [_to_document_extraction_entity(e) for e in result.scalars().all()]

    async def create_ai_conversation(
        self,
        family_id: uuid.UUID,
        profile_id: uuid.UUID,
        agent_session_id: str,
        conversation_type: str,
        context_scope: dict,
        subject_id: Optional[uuid.UUID] = None
    ) -> AIConversationEntity:
        conv = AIConversation(
            family_id=family_id,
            profile_id=profile_id,
            agent_session_id=agent_session_id,
            conversation_type=conversation_type,
            context_scope=context_scope,
            subject_id=subject_id
        )
        self.session.add(conv)
        await self.session.flush()
        await self.session.refresh(conv)
        return _to_ai_conversation_entity(conv)

    async def get_ai_conversation(self, conversation_id: uuid.UUID) -> Optional[AIConversationEntity]:
        result = await self.session.execute(select(AIConversation).where(AIConversation.id == conversation_id))
        conv = result.scalar_one_or_none()
        return _to_ai_conversation_entity(conv) if conv else None

    async def update_ai_conversation_context(self, conversation_id: uuid.UUID, context_scope: dict) -> Optional[AIConversationEntity]:
        result = await self.session.execute(select(AIConversation).where(AIConversation.id == conversation_id))
        conv = result.scalar_one_or_none()
        if conv:
            conv.context_scope = context_scope
            await self.session.flush()
            await self.session.refresh(conv)
            return _to_ai_conversation_entity(conv)
        return None

    async def list_ai_conversations(self, family_id: uuid.UUID, profile_id: uuid.UUID) -> List[AIConversationEntity]:

        result = await self.session.execute(
            select(AIConversation)
            .where(
                AIConversation.family_id == family_id,
                AIConversation.profile_id == profile_id
            )
            .order_by(AIConversation.updated_at.desc())
        )
        return [_to_ai_conversation_entity(c) for c in result.scalars().all()]

    async def create_ai_action(
        self,
        family_id: uuid.UUID,
        profile_id: uuid.UUID,
        agent_session_id: str,
        action_type: str,
        input_data: dict,
        output_data: dict,
        requires_approval: bool = False,
        status: str = "executed",
        subject_id: Optional[uuid.UUID] = None
    ) -> AIActionEntity:
        action = AIAction(
            family_id=family_id,
            profile_id=profile_id,
            agent_session_id=agent_session_id,
            action_type=action_type,
            input_json=input_data,
            output_json=output_data,
            requires_approval=requires_approval,
            status=status,
            subject_id=subject_id
        )
        self.session.add(action)
        await self.session.flush()
        await self.session.refresh(action)
        return _to_ai_action_entity(action)

    async def approve_or_reject_ai_action(
        self,
        action_id: uuid.UUID,
        status: str,
        approved_by_profile_id: uuid.UUID,
        approved_at: datetime
    ) -> Optional[AIActionEntity]:
        result = await self.session.execute(select(AIAction).where(AIAction.id == action_id))
        action = result.scalar_one_or_none()
        if action:
            action.status = status
            action.approved_by_profile_id = approved_by_profile_id
            action.approved_at = approved_at
            await self.session.flush()
            await self.session.refresh(action)
            return _to_ai_action_entity(action)
        return None

    async def get_ai_action(self, action_id: uuid.UUID) -> Optional[AIActionEntity]:
        result = await self.session.execute(select(AIAction).where(AIAction.id == action_id))
        action = result.scalar_one_or_none()
        return _to_ai_action_entity(action) if action else None

    async def list_ai_actions(self, family_id: uuid.UUID, subject_id: Optional[uuid.UUID] = None) -> List[AIActionEntity]:
        query = select(AIAction).where(AIAction.family_id == family_id)
        if subject_id is not None:
            query = query.where(AIAction.subject_id == subject_id)
        query = query.order_by(AIAction.created_at.desc())
        
        result = await self.session.execute(query)
        return [_to_ai_action_entity(a) for a in result.scalars().all()]
    async def get_family_summary_projection(self, family_id: uuid.UUID) -> Optional[Dict[str, Any]]:
        """
        High-performance column projection query avoiding full object graph hydration.
        """
        stmt = (
            select(
                Family.id,
                Family.name,
                Family.primary_coordinator_profile_id,
                Family.created_at,
                func.count(FamilyMembership.id).label("member_count")
            )
            .outerjoin(FamilyMembership, Family.id == FamilyMembership.family_id)
            .where(Family.id == family_id)
            .group_by(Family.id, Family.name, Family.primary_coordinator_profile_id, Family.created_at)
        )
        result = await self.session.execute(stmt)
        row = result.first()
        if not row:
            return None
        return {
            "family_id": row.id,
            "name": row.name,
            "primary_coordinator_profile_id": row.primary_coordinator_profile_id,
            "created_at": row.created_at,
            "member_count": row.member_count
        }

    async def get_care_subjects_projection(self, family_id: uuid.UUID) -> List[Dict[str, Any]]:
        """
        Column projection query selecting only vital care subject columns.
        """
        stmt = (
            select(
                CareSubject.id,
                CareSubject.family_id,
                CareSubject.fhir_patient_id,
                CareSubject.profile_id,
                CareSubject.relationship_to_coordinator,
                CareSubject.status
            )
            .where(CareSubject.family_id == family_id)
        )
        result = await self.session.execute(stmt)
        return [
            {
                "subject_id": r.id,
                "family_id": r.family_id,
                "fhir_patient_id": r.fhir_patient_id,
                "profile_id": r.profile_id,
                "relationship": r.relationship_to_coordinator,
                "status": r.status
            }
            for r in result.all()
        ]



class SQLAlchemyConsentRepository(IConsentRepository):

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, consent_id: uuid.UUID) -> Optional[ConsentEntity]:
        result = await self.session.execute(
            select(Consent).where(Consent.id == consent_id)
        )
        consent = result.scalar_one_or_none()
        return _to_consent_entity(consent) if consent else None

    async def get_consent(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantor_profile_id: uuid.UUID,
        grantee_profile_id: uuid.UUID
    ) -> Optional[ConsentEntity]:
        result = await self.session.execute(
            select(Consent).where(
                Consent.family_id == family_id,
                Consent.subject_id == subject_id,
                Consent.grantor_profile_id == grantor_profile_id,
                Consent.grantee_profile_id == grantee_profile_id
            )
        )
        consent = result.scalar_one_or_none()
        return _to_consent_entity(consent) if consent else None

    async def create_or_update_consent(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantor_profile_id: uuid.UUID,
        grantee_profile_id: uuid.UUID,
        scope: dict,
        status: str = "active",
        consent_type: str = "clinical_data_access",
        expires_at: Optional[datetime] = None
    ) -> ConsentEntity:
        result = await self.session.execute(
            select(Consent).where(
                Consent.family_id == family_id,
                Consent.subject_id == subject_id,
                Consent.grantor_profile_id == grantor_profile_id,
                Consent.grantee_profile_id == grantee_profile_id
            )
        )
        consent = result.scalar_one_or_none()
        if consent:
            consent.scope = scope
            consent.status = status
            consent.consent_type = consent_type
            if expires_at is not None:
                consent.expires_at = expires_at
            if status == "revoked":
                consent.revoked_at = datetime.now()
            else:
                consent.revoked_at = None
            consent.version += 1
        else:
            consent = Consent(
                family_id=family_id,
                subject_id=subject_id,
                grantor_profile_id=grantor_profile_id,
                grantee_profile_id=grantee_profile_id,
                consent_type=consent_type,
                scope=scope,
                status=status,
                expires_at=expires_at,
                version=1
            )
            self.session.add(consent)
        await self.session.flush()
        await self.session.refresh(consent)
        return _to_consent_entity(consent)

    async def list_by_family(self, family_id: uuid.UUID) -> List[ConsentEntity]:
        result = await self.session.execute(
            select(Consent)
            .where(Consent.family_id == family_id)
            .order_by(Consent.created_at.desc())
        )
        return [_to_consent_entity(c) for c in result.scalars().all()]

    async def list_by_parent(self, grantor_profile_id: uuid.UUID) -> List[ConsentEntity]:
        result = await self.session.execute(
            select(Consent).where(Consent.grantor_profile_id == grantor_profile_id)
        )
        return [_to_consent_entity(c) for c in result.scalars().all()]

    async def list_by_grantee(self, grantee_profile_id: uuid.UUID) -> List[ConsentEntity]:
        result = await self.session.execute(
            select(Consent).where(Consent.grantee_profile_id == grantee_profile_id)
        )
        return [_to_consent_entity(c) for c in result.scalars().all()]

    async def revoke_consent(self, consent_id: uuid.UUID, revoked_by_profile_id: uuid.UUID) -> Optional[ConsentEntity]:
        result = await self.session.execute(
            select(Consent).where(Consent.id == consent_id)
        )
        consent = result.scalar_one_or_none()
        if not consent:
            return None
        consent.status = "revoked"
        consent.revoked_at = datetime.now()
        consent.version += 1
        await self.session.flush()
        await self.session.refresh(consent)
        return _to_consent_entity(consent)



# Backward-compatible repository aliases
SQLAlchemyUserRepository = SQLAlchemyAppProfileRepository
SQLAlchemyCareCircleRepository = SQLAlchemyFamilyRepository

