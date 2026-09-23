import uuid
from datetime import datetime, date
from typing import Optional, List
from sqlalchemy import String, ForeignKey, Boolean, DateTime, Date, Integer, UniqueConstraint, CheckConstraint, func, JSON, Numeric, Index, text

from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AppProfile(Base):
    __tablename__ = "app_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    iam_subject_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, index=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), default="UTC", nullable=False)
    preferred_language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    avatar_file_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    memberships = relationship("FamilyMembership", back_populates="profile", cascade="all, delete-orphan")
    consents_given = relationship("Consent", foreign_keys="[Consent.grantor_profile_id]", back_populates="grantor", cascade="all, delete-orphan")
    consents_received = relationship("Consent", foreign_keys="[Consent.grantee_profile_id]", back_populates="grantee", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("length(status) > 0", name="ck_app_profiles_status"),
        CheckConstraint("length(timezone) >= 2", name="ck_app_profiles_timezone"),
    )




class PlatformOrganization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    families = relationship("Family", back_populates="organization")


class Family(Base):
    __tablename__ = "families"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    primary_coordinator_profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("PlatformOrganization", back_populates="families")
    primary_coordinator = relationship("AppProfile", foreign_keys=[primary_coordinator_profile_id])

    members = relationship("FamilyMembership", back_populates="family", cascade="all, delete-orphan")
    event_logs = relationship("EventLog", back_populates="family", cascade="all, delete-orphan")
    relationships = relationship("FamilyRelationship", back_populates="family", cascade="all, delete-orphan")
    care_subjects = relationship("CareSubject", back_populates="family", cascade="all, delete-orphan")
    care_relationships = relationship("CareRelationship", back_populates="family", cascade="all, delete-orphan")
    care_tasks = relationship("CareTask", back_populates="family", cascade="all, delete-orphan")
    checkins = relationship("WellbeingCheckin", back_populates="family", cascade="all, delete-orphan")
    monitoring_preferences = relationship("MonitoringPreference", back_populates="family", cascade="all, delete-orphan")
    ai_insights = relationship("AIInsight", back_populates="family", cascade="all, delete-orphan")
    consents = relationship("Consent", back_populates="family", cascade="all, delete-orphan")
    wearable_connections = relationship("WearableConnection", back_populates="family", cascade="all, delete-orphan")

    __table_args__ = (

        Index("ix_families_primary_coordinator", "primary_coordinator_profile_id"),
    )



class FamilyMembership(Base):
    __tablename__ = "family_memberships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    membership_role: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    profile = relationship("AppProfile", back_populates="memberships")
    family = relationship("Family", back_populates="members")

    __table_args__ = (
        UniqueConstraint("family_id", "profile_id", name="uq_family_profile"),
        CheckConstraint("length(status) > 0", name="ck_family_memberships_status"),
        CheckConstraint("length(membership_role) > 0", name="ck_family_memberships_role"),
        Index("ix_family_memberships_family_profile", "family_id", "profile_id"),
    )




class FamilyRelationship(Base):
    __tablename__ = "family_relationships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    from_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    to_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    family = relationship("Family", back_populates="relationships")
    from_profile = relationship("AppProfile", foreign_keys=[from_profile_id])
    to_profile = relationship("AppProfile", foreign_keys=[to_profile_id])


class CareSubject(Base):
    __tablename__ = "care_subjects"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="SET NULL"), nullable=True)
    fhir_patient_id: Mapped[str] = mapped_column(String(255), nullable=False)
    relationship_to_coordinator: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    country_code: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    timezone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


    # Relationships
    family = relationship("Family", back_populates="care_subjects")
    profile = relationship("AppProfile")
    consents = relationship("Consent", back_populates="subject", cascade="all, delete-orphan")
    adherence_events = relationship("MedicationAdherenceEvent", back_populates="subject", cascade="all, delete-orphan")
    checkins = relationship("WellbeingCheckin", back_populates="subject", cascade="all, delete-orphan")
    wearable_identity = relationship("CareSubjectWearableIdentity", back_populates="subject", uselist=False, cascade="all, delete-orphan")
    wearable_connections = relationship("WearableConnection", back_populates="subject", cascade="all, delete-orphan")
    wearable_snapshots = relationship("WearableMetricSnapshot", back_populates="subject", cascade="all, delete-orphan")





class CareRelationship(Base):
    __tablename__ = "care_relationships"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    relationship_type: Mapped[str] = mapped_column(String(100), nullable=False)
    access_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    family = relationship("Family", back_populates="care_relationships")
    subject = relationship("CareSubject")
    profile = relationship("AppProfile")

    __table_args__ = (
        UniqueConstraint("family_id", "subject_id", "profile_id", name="uq_care_relationship_family_subject_profile"),
        CheckConstraint("length(status) > 0", name="ck_care_relationships_status"),
        Index("ix_care_relationships_subject_profile", "subject_id", "profile_id"),
        Index("ix_care_relationships_family_subject", "family_id", "subject_id"),
    )


class CareTask(Base):
    __tablename__ = "care_tasks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False)
    created_by_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    assigned_to_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_by_profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="SET NULL"), nullable=True)
    source_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


    # Relationships
    family = relationship("Family", back_populates="care_tasks")
    subject = relationship("CareSubject")
    created_by = relationship("AppProfile", foreign_keys=[created_by_profile_id])
    assigned_to = relationship("AppProfile", foreign_keys=[assigned_to_profile_id])
    completed_by = relationship("AppProfile", foreign_keys=[completed_by_profile_id])

    __table_args__ = (
        CheckConstraint("length(status) > 0", name="ck_care_tasks_status"),
        CheckConstraint("length(priority) > 0", name="ck_care_tasks_priority"),
        Index("ix_care_tasks_family_status_due", "family_id", "status", "due_at"),
    )


class MedicationAdherenceEvent(Base):
    __tablename__ = "medication_adherence_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False)
    fhir_medication_request_id: Mapped[str] = mapped_column(String(255), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="scheduled", nullable=False)
    confirmed_by_profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="SET NULL"), nullable=True)
    source: Mapped[str] = mapped_column(String(100), default="caregiver", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    subject = relationship("CareSubject", back_populates="adherence_events")
    confirmed_by = relationship("AppProfile")

    __table_args__ = (
        CheckConstraint("length(status) > 0", name="ck_medication_adherence_status"),
        Index("ix_medication_adherence_events_subject_scheduled", "subject_id", text("scheduled_at DESC")),
    )


class WellbeingCheckin(Base):
    __tablename__ = "wellbeing_checkins"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False)
    submitted_by_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    feeling: Mapped[str] = mapped_column(String(50), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    voice_file_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    severity: Mapped[str] = mapped_column(String(50), default="low", nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    family = relationship("Family", back_populates="checkins")
    subject = relationship("CareSubject", back_populates="checkins")
    submitted_by = relationship("AppProfile")

    __table_args__ = (
        CheckConstraint("length(feeling) > 0", name="ck_wellbeing_checkins_feeling"),
        CheckConstraint("length(severity) > 0", name="ck_wellbeing_checkins_severity"),
        Index("ix_wellbeing_checkins_subject_submitted", "subject_id", text("submitted_at DESC")),
    )






class MonitoringPreference(Base):
    __tablename__ = "monitoring_preferences"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False)
    metric: Mapped[str] = mapped_column(String(50), nullable=False)
    baseline_period_days: Mapped[int] = mapped_column(Integer, default=7, nullable=False)
    threshold_config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    notification_level: Mapped[str] = mapped_column(String(50), default="normal", nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


    # Relationships
    family = relationship("Family", back_populates="monitoring_preferences")
    subject = relationship("CareSubject")


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="low", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(String, nullable=False)
    observation: Mapped[str] = mapped_column(String, nullable=False)
    recommendation: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    timeframe_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timeframe_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(precision=5, scale=2), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    generated_by: Mapped[str] = mapped_column(String(100), default="agent", nullable=False)
    agent_run_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    trigger_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    baseline_comparison: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    actionability: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    family = relationship("Family", back_populates="ai_insights")
    subject = relationship("CareSubject")
    sources = relationship("AIInsightSource", back_populates="insight", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("length(severity) > 0", name="ck_ai_insights_severity"),
        Index("ix_ai_insights_subject_created", "subject_id", text("created_at DESC")),
    )




class AIInsightSource(Base):
    __tablename__ = "ai_insight_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    insight_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("ai_insights.id", ondelete="CASCADE"), nullable=False)
    source_type: Mapped[str] = mapped_column(String(100), nullable=False)
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)
    source_version: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    insight = relationship("AIInsight", back_populates="sources")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="SET NULL"), nullable=True)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="normal", nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    action_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    action_payload_json: Mapped[dict] = mapped_column("action_payload", JSON, default=dict, nullable=False)
    source_event_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    dismissed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    recipient = relationship("AppProfile")
    family = relationship("Family")
    subject = relationship("CareSubject")

    __table_args__ = (
        Index("ix_notifications_recipient_read_created", "recipient_profile_id", "read_at", text("created_at DESC")),
    )


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    notification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[str] = mapped_column(String(100), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    provider_message_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    failure_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    notification = relationship("Notification")


class FamilyConversation(Base):
    __tablename__ = "family_conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    family = relationship("Family")
    subject = relationship("CareSubject")
    messages = relationship("FamilyMessage", back_populates="conversation", order_by="FamilyMessage.created_at.asc()", cascade="all, delete-orphan")


class FamilyMessage(Base):
    __tablename__ = "family_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("family_conversations.id", ondelete="CASCADE"), nullable=False)
    sender_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), nullable=False)
    body: Mapped[str] = mapped_column(String, nullable=False)
    file_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    reply_to_message_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("family_messages.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    conversation = relationship("FamilyConversation", back_populates="messages")
    sender = relationship("AppProfile")
    reply_to = relationship("FamilyMessage", remote_side=[id])

    __table_args__ = (
        Index("ix_family_messages_conversation_created", "conversation_id", "created_at"),
    )



class AppointmentCoordination(Base):
    __tablename__ = "appointment_coordination"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False)
    fhir_appointment_id: Mapped[str] = mapped_column(String(255), nullable=False)
    assigned_caregiver_profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="SET NULL"), nullable=True)
    preparation_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    summary_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    reminder_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    family = relationship("Family")
    subject = relationship("CareSubject")
    assigned_caregiver = relationship("AppProfile")


class HealthDocument(Base):
    __tablename__ = "health_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False)
    filenest_file_id: Mapped[str] = mapped_column(String(255), nullable=False)
    document_type: Mapped[str] = mapped_column(String(100), default="prescription", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    source_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    ai_processing_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    extraction_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


    # Relationships
    family = relationship("Family")
    subject = relationship("CareSubject")
    source_profile = relationship("AppProfile")
    extractions = relationship("DocumentExtraction", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("length(status) > 0", name="ck_health_documents_status"),
    )



class DocumentExtraction(Base):
    __tablename__ = "document_extractions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("health_documents.id", ondelete="CASCADE"), nullable=False)
    extraction_type: Mapped[str] = mapped_column(String(100), nullable=False)
    raw_output: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    normalized_output: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    confidence: Mapped[Optional[float]] = mapped_column(Numeric(precision=5, scale=2), nullable=True)
    review_status: Mapped[str] = mapped_column(String(50), default="pending_review", nullable=False)
    reviewed_by_profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    document = relationship("HealthDocument", back_populates="extractions")
    reviewed_by = relationship("AppProfile")


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="SET NULL"), nullable=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    agent_session_id: Mapped[str] = mapped_column(String(255), nullable=False)
    conversation_type: Mapped[str] = mapped_column(String(100), default="consultation", nullable=False)
    context_scope: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    family = relationship("Family")
    subject = relationship("CareSubject")
    profile = relationship("AppProfile")


class AIAction(Base):
    __tablename__ = "ai_actions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="SET NULL"), nullable=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    agent_session_id: Mapped[str] = mapped_column(String(255), nullable=False)
    action_type: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="executed", nullable=False)
    input_json: Mapped[dict] = mapped_column("input", JSON, default=dict, nullable=False)
    output_json: Mapped[dict] = mapped_column("output", JSON, default=dict, nullable=False)
    requires_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    approved_by_profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="SET NULL"), nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    family = relationship("Family")
    subject = relationship("CareSubject")
    profile = relationship("AppProfile", foreign_keys=[profile_id])
    approved_by = relationship("AppProfile", foreign_keys=[approved_by_profile_id])

    __table_args__ = (
        CheckConstraint("length(status) > 0", name="ck_ai_actions_status"),
    )




class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False)
    grantor_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    grantee_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=False)
    consent_type: Mapped[str] = mapped_column(String(50), default="explicit", nullable=False)
    scope: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    family = relationship("Family", back_populates="consents")
    subject = relationship("CareSubject", back_populates="consents")
    grantor = relationship("AppProfile", foreign_keys=[grantor_profile_id], back_populates="consents_given")
    grantee = relationship("AppProfile", foreign_keys=[grantee_profile_id], back_populates="consents_received")

    __table_args__ = (
        UniqueConstraint("family_id", "subject_id", "grantor_profile_id", "grantee_profile_id", name="uq_consent_flow"),
        CheckConstraint("grantor_profile_id != grantee_profile_id", name="ck_consent_grantor_not_grantee"),
        CheckConstraint("status IN ('active', 'revoked', 'expired', 'suspended')", name="ck_consent_status"),
    )



class IdempotencyRecord(Base):
    __tablename__ = "idempotency_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idempotency_key: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="CASCADE"), nullable=True)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    response_body: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_idempotency_key_lookup", "idempotency_key", "user_id"),
    )


# ==============================================================================
# Wearable Identity & Provider Connection Models
# ==============================================================================
# APPLICATION DATABASE RULE:
# The KinGuardian application database maintains the relationship between:
# KinGuardian user (AppProfile) -> KinGuardian care subject (CareSubject) -> Wearable identity -> Open Wearables user -> Provider connection.
#
# NOTE: Do NOT store the entire wearable time-series dataset in the KinGuardian transactional database.
# High-frequency biometrics (continuous epoch data) reside strictly in the Open Wearables layer.
# ==============================================================================

class CareSubjectWearableIdentity(Base):
    """
    Persistent identity mapping entity in KinGuardian application database.
    Represents: KinGuardian User -> KinGuardian Care Subject -> Wearable Identity -> Open Wearables User.
    """
    __tablename__ = "care_subject_wearable_identities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    open_wearables_user_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    baseline_step_goal: Mapped[int] = mapped_column(Integer, default=5000, nullable=False)
    baseline_sleep_hours_goal: Mapped[float] = mapped_column(Numeric(4, 2), default=7.00, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    family = relationship("Family")
    subject = relationship("CareSubject", back_populates="wearable_identity")
    provider_connections = relationship("WearableProviderConnection", back_populates="wearable_identity", cascade="all, delete-orphan")

    __table_args__ = (
        CheckConstraint("baseline_step_goal >= 1000", name="ck_wearable_identity_step_goal"),
        CheckConstraint("length(open_wearables_user_id) > 0", name="ck_wearable_identity_ext_id"),
    )


class WearableProviderConnection(Base):
    """
    Persistent state of a third-party wearable provider link (Garmin, Oura, Apple Health, Fitbit).
    Represents: Wearable Identity -> Provider Connection.
    """
    __tablename__ = "wearable_provider_connections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wearable_identity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subject_wearable_identities.id", ondelete="CASCADE"), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(50), nullable=False)  # garmin, oura, apple_health, fitbit, etc.
    provider_user_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # active, inactive, pending, revoked, error
    capabilities: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    wearable_identity = relationship("CareSubjectWearableIdentity", back_populates="provider_connections")

    __table_args__ = (
        UniqueConstraint("wearable_identity_id", "provider", name="uq_wearable_identity_provider"),
        Index("ix_wearable_connections_provider_status", "provider", "status"),
    )


class WearableConnection(Base):
    """
    Persistent connection record representing a third-party wearable provider link.
    Table: wearable_connections
    Maintains:
    KinGuardian user (profile_id) -> Care subject (subject_id) -> Open Wearables user (open_wearables_user_id) -> Provider connection
    """
    __tablename__ = "wearable_connections"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    family_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("families.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    profile_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("app_profiles.id", ondelete="SET NULL"), nullable=True, index=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)  # garmin, fitbit, oura, apple_health, etc.
    open_wearables_user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    provider_user_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    connection_status: Mapped[str] = mapped_column(String(50), default="connected", nullable=False)  # connected, disconnected, pending, error, revoked
    permissions: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    connected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    disconnected_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    family = relationship("Family", back_populates="wearable_connections")
    subject = relationship("CareSubject", back_populates="wearable_connections")
    profile = relationship("AppProfile")
    data_sources = relationship("WearableDataSource", back_populates="connection", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("subject_id", "provider", name="uq_wearable_connections_subject_provider"),
        Index("ix_wearable_conns_provider_status", "provider", "connection_status"),
        CheckConstraint("connection_status IN ('connected', 'disconnected', 'pending', 'error', 'revoked')", name="ck_wearable_conn_status"),
    )


class WearableDataSource(Base):
    """
    Persistent physical device or source stream representing a connected wearable hardware/service.
    Table: wearable_data_sources
    Examples:
    - Apple Watch
    - Garmin Venu
    - Fitbit Charge
    - Oura Ring
    """
    __tablename__ = "wearable_data_sources"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    connection_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("wearable_connections.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)  # garmin, fitbit, oura, apple_health, etc.
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # smartwatch, smart_ring, fitness_tracker, mobile_sdk, cgm
    device_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # "Apple Watch", "Garmin Venu", "Fitbit Charge", "Oura Ring"
    device_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # hardware serial or external device UUID
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)  # active, inactive, paired, disconnected
    last_data_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    connection = relationship("WearableConnection", back_populates="data_sources")

    __table_args__ = (
        Index("ix_wearable_sources_provider_type", "provider", "source_type"),
        Index("ix_wearable_sources_status", "status"),
    )


class WearableMetricSnapshot(Base):
    """
    Compact materialized metric projection in PostgreSQL for local analytics,
    sub-second dashboard queries, trend detection, and cross-source correlation.
    Table: wearable_metric_snapshots
    """
    __tablename__ = "wearable_metric_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subject_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("care_subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    metric_type: Mapped[str] = mapped_column(String(100), nullable=False)
    measured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    value: Mapped[float] = mapped_column(Numeric(12, 4), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)  # garmin, oura, apple_health, fitbit
    device: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Apple Watch, Garmin Venu, etc.
    source_reference: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    subject = relationship("CareSubject", back_populates="wearable_snapshots")

    __table_args__ = (
        Index("ix_wearable_snapshots_subj_type_meas", "subject_id", "metric_type", text("measured_at DESC")),
        Index("ix_wearable_snapshots_subj_meas", "subject_id", text("measured_at DESC")),
    )






