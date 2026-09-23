import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid
from app.db import Base


def uid() -> uuid.UUID:
    return uuid.uuid4()


class Timestamped(Base):
    __abstract__ = True
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class Profile(Timestamped):
    __tablename__ = "profiles"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    identity_subject: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320))
    display_name: Mapped[str] = mapped_column(String(160))
    timezone: Mapped[str] = mapped_column(String(64), default="UTC")
    password_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(32), default="coordinator")
    is_active: Mapped[bool] = mapped_column(default=True)


class Family(Timestamped):
    __tablename__ = "families"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    name: Mapped[str] = mapped_column(String(160))
    home_timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    status: Mapped[str] = mapped_column(String(24), default="active")


class Membership(Timestamped):
    __tablename__ = "memberships"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("families.id", ondelete="CASCADE"), index=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(32))  # coordinator, parent, caregiver, observer
    status: Mapped[str] = mapped_column(String(24), default="active")
    __table_args__ = (UniqueConstraint("family_id", "profile_id", name="uq_membership_family_profile"),)


class CareSubject(Timestamped):
    __tablename__ = "care_subjects"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("families.id", ondelete="CASCADE"), index=True)
    profile_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("profiles.id", ondelete="SET NULL"), unique=True)
    external_patient_ref: Mapped[str | None] = mapped_column(String(255), unique=True)
    preferred_timezone: Mapped[str] = mapped_column(String(64), default="Asia/Kolkata")
    status: Mapped[str] = mapped_column(String(24), default="active")


class CareGrant(Timestamped):
    __tablename__ = "care_grants"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"), index=True)
    profile_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(24), default="active")  # active | inactive
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (UniqueConstraint("subject_id", "profile_id", name="uq_care_grant_subject_profile"),)


class Consent(Timestamped):
    __tablename__ = "consents"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"), index=True)
    granted_to_profile_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id", ondelete="CASCADE"))
    scopes: Mapped[list[str]] = mapped_column(JSON, default=list)
    status: Mapped[str] = mapped_column(String(24), default="active")  # active | inactive
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CareTask(Timestamped):
    __tablename__ = "care_tasks"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("families.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id"))
    assigned_to: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id"))
    title: Mapped[str] = mapped_column(String(200))
    detail: Mapped[str | None] = mapped_column(Text)
    priority: Mapped[str] = mapped_column(String(16), default="routine")
    status: Mapped[str] = mapped_column(String(24), default="open")
    due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    __table_args__ = (Index("ix_task_subject_status_due", "subject_id", "status", "due_at"),)


class CheckIn(Timestamped):
    __tablename__ = "checkins"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"), index=True)
    submitted_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id"))
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    mood: Mapped[str] = mapped_column(String(24))
    note: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(16), default="normal")


class MedicationAdherence(Timestamped):
    """A care-coordination confirmation; medication definition remains in the FHIR owner."""
    __tablename__ = "medication_adherence"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"), index=True)
    medication_ref: Mapped[str] = mapped_column(String(255), index=True)
    confirmed_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id"))
    taken_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    due_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source: Mapped[str] = mapped_column(String(24), default="parent")


class DocumentReference(Timestamped):
    """Metadata only; bytes and malware processing remain owned by FileNest."""
    __tablename__ = "document_references"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("families.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"), index=True)
    filenest_file_id: Mapped[str] = mapped_column(String(255), unique=True)
    classification: Mapped[str] = mapped_column(String(64), default="unclassified")
    status: Mapped[str] = mapped_column(String(24), default="pending")
    uploaded_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id"))


class Conversation(Timestamped):
    __tablename__ = "conversations"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("families.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"))
    visibility: Mapped[str] = mapped_column(String(24), default="family")


class Message(Timestamped):
    __tablename__ = "messages"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    conversation_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("conversations.id", ondelete="CASCADE"), index=True)
    sender_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id"))
    body: Mapped[str] = mapped_column(Text)


class Notification(Timestamped):
    __tablename__ = "notifications"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("families.id", ondelete="CASCADE"), index=True)
    recipient_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id", ondelete="CASCADE"), index=True)
    event_type: Mapped[str] = mapped_column(String(100))
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class Insight(Timestamped):
    __tablename__ = "insights"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("families.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="SET NULL"))
    conversation_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=True, index=True)
    type: Mapped[str] = mapped_column(String(32), default="general")
    summary: Mapped[str] = mapped_column(Text)
    observation: Mapped[str | None] = mapped_column(Text, nullable=True)
    timeframe: Mapped[str | None] = mapped_column(String(64), nullable=True)
    sources: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_steps: Mapped[str | None] = mapped_column(Text, nullable=True)
    deduplication_key: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    status: Mapped[str] = mapped_column(String(24), default="active")
    source: Mapped[str] = mapped_column(String(32), default="analytics")


class WearableConnection(Timestamped):
    __tablename__ = "wearable_connections"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(64), default="fitbit")
    connection_status: Mapped[str] = mapped_column(String(32), default="connected")
    device_type: Mapped[str] = mapped_column(String(64), default="Apple Watch / Omron")
    device_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    last_sync_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    disconnected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sync_status: Mapped[str] = mapped_column(String(32), default="synced")
    is_stale: Mapped[bool] = mapped_column(Boolean, default=False)
    access_token: Mapped[str | None] = mapped_column(String(512), nullable=True)
    refresh_token: Mapped[str | None] = mapped_column(String(512), nullable=True)


class WearableData(Timestamped):
    __tablename__ = "wearable_data"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"), index=True)
    connection_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("wearable_connections.id", ondelete="SET NULL"), nullable=True)
    steps: Mapped[int] = mapped_column(Integer, default=0)
    heart_rate: Mapped[int] = mapped_column(Integer, default=72)
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    source: Mapped[str] = mapped_column(String(64), default="garmin", index=True)
    last_sync_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    device_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sleep_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("profiles.id", ondelete="SET NULL"))
    family_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("families.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(100), index=True)
    resource_type: Mapped[str] = mapped_column(String(64))
    resource_id: Mapped[str] = mapped_column(String(64))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    aggregate_type: Mapped[str] = mapped_column(String(64))
    aggregate_id: Mapped[str] = mapped_column(String(64))
    event_type: Mapped[str] = mapped_column(String(120), index=True)
    family_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("families.id", ondelete="SET NULL"), index=True)
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(String(24), default="pending", index=True)
    attempts: Mapped[int] = mapped_column(default=0)
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True)


class Appointment(Timestamped):
    __tablename__ = "appointments"
    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uid)
    family_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("families.id", ondelete="CASCADE"), index=True)
    subject_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("care_subjects.id", ondelete="CASCADE"), index=True)
    created_by: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("profiles.id"))
    doctor_name: Mapped[str] = mapped_column(String(200))
    specialty: Mapped[str | None] = mapped_column(String(100))
    date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    time: Mapped[str] = mapped_column(String(10))
    location: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(24), default="scheduled")
    telehealth_link: Mapped[str | None] = mapped_column(String(500))
    notes: Mapped[str | None] = mapped_column(Text)
