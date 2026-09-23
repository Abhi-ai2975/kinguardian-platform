from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    Sequence,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base
from app.models.enums import EncounterReferenceType
from app.models.task.enums import (
    TaskInsuranceReferenceType,
    TaskIntent,
    TaskLocationReferenceType,
    TaskOwnerReferenceType,
    TaskPartOfReferenceType,
    TaskPriority,
    TaskRequesterReferenceType,
    TaskRelevantHistoryReferenceType,
    TaskRestrictionRecipientReferenceType,
    TaskStatus,
)

task_id_seq = Sequence("task_pub_seq", start=280000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class TaskModel(Base):
    __tablename__ = "task"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    task_id = Column(
        Integer,
        task_id_seq,
        server_default=task_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── status (1..1 code) ────────────────────────────────────────────────────
    status = Column(
        Enum(TaskStatus, name="task_status"),
        nullable=False,
    )

    # ── intent (1..1 code) ───────────────────────────────────────────────────
    intent = Column(
        Enum(TaskIntent, name="task_intent"),
        nullable=False,
    )

    # ── priority (0..1 code) ─────────────────────────────────────────────────
    priority = Column(
        Enum(TaskPriority, name="task_priority"),
        nullable=True,
    )

    # ── statusReason (0..1 CodeableConcept) ──────────────────────────────────
    status_reason_system = Column(String, nullable=True)
    status_reason_code = Column(String, nullable=True)
    status_reason_display = Column(String, nullable=True)
    status_reason_text = Column(String, nullable=True)

    # ── businessStatus (0..1 CodeableConcept) ────────────────────────────────
    business_status_system = Column(String, nullable=True)
    business_status_code = Column(String, nullable=True)
    business_status_display = Column(String, nullable=True)
    business_status_text = Column(String, nullable=True)

    # ── code (0..1 CodeableConcept) ──────────────────────────────────────────
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # ── description (0..1 string) ────────────────────────────────────────────
    description = Column(String, nullable=True)

    # ── instantiatesCanonical (0..1) ─────────────────────────────────────────
    instantiates_canonical = Column(String, nullable=True)

    # ── instantiatesUri (0..1) ───────────────────────────────────────────────
    instantiates_uri = Column(String, nullable=True)

    # ── groupIdentifier (0..1 Identifier) — flat ─────────────────────────────
    group_identifier_use = Column(String, nullable=True)
    group_identifier_system = Column(String, nullable=True)
    group_identifier_value = Column(String, nullable=True)
    group_identifier_type_system = Column(String, nullable=True)
    group_identifier_type_code = Column(String, nullable=True)
    group_identifier_type_display = Column(String, nullable=True)
    group_identifier_type_text = Column(String, nullable=True)

    # ── focus (0..1 Reference(Any) open) ─────────────────────────────────────
    focus_type = Column(String, nullable=True)
    focus_id = Column(Integer, nullable=True)
    focus_display = Column(String, nullable=True)

    # ── for (0..1 Reference(Any) open) — 'for' is a Python keyword ───────────
    for_type = Column(String, nullable=True)
    for_id = Column(Integer, nullable=True)
    for_display = Column(String, nullable=True)

    # ── encounter (0..1 Reference(Encounter) shared enum) ────────────────────
    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, nullable=True)
    encounter_display = Column(String, nullable=True)

    # ── executionPeriod (0..1 Period) ─────────────────────────────────────────
    execution_period_start = Column(DateTime(timezone=True), nullable=True)
    execution_period_end = Column(DateTime(timezone=True), nullable=True)

    # ── authoredOn (0..1 dateTime) ───────────────────────────────────────────
    authored_on = Column(DateTime(timezone=True), nullable=True)

    # ── lastModified (0..1 dateTime) ─────────────────────────────────────────
    last_modified = Column(DateTime(timezone=True), nullable=True)

    # ── requester (0..1 Reference — closed) ──────────────────────────────────
    requester_type = Column(
        Enum(TaskRequesterReferenceType, name="task_requester_reference_type"),
        nullable=True,
    )
    requester_id = Column(Integer, nullable=True)
    requester_display = Column(String, nullable=True)

    # ── owner (0..1 Reference — closed) ──────────────────────────────────────
    owner_type = Column(
        Enum(TaskOwnerReferenceType, name="task_owner_reference_type"),
        nullable=True,
    )
    owner_id = Column(Integer, nullable=True)
    owner_display = Column(String, nullable=True)

    # ── location (0..1 Reference(Location)) ──────────────────────────────────
    location_type = Column(
        Enum(TaskLocationReferenceType, name="task_location_reference_type"),
        nullable=True,
    )
    location_id = Column(Integer, nullable=True)
    location_display = Column(String, nullable=True)

    # ── reasonCode (0..1 CodeableConcept) ────────────────────────────────────
    reason_code_system = Column(String, nullable=True)
    reason_code_code = Column(String, nullable=True)
    reason_code_display = Column(String, nullable=True)
    reason_code_text = Column(String, nullable=True)

    # ── reasonReference (0..1 Reference(Any) open) ───────────────────────────
    reason_reference_type = Column(String, nullable=True)
    reason_reference_id = Column(Integer, nullable=True)
    reason_reference_display = Column(String, nullable=True)

    # ── restriction (0..1 BackboneElement — flat; recipient is child table) ──
    restriction_repetitions = Column(Integer, nullable=True)
    restriction_period_start = Column(DateTime(timezone=True), nullable=True)
    restriction_period_end = Column(DateTime(timezone=True), nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    identifiers = relationship(
        "TaskIdentifier",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    based_on = relationship(
        "TaskBasedOn",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    part_of = relationship(
        "TaskPartOf",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    performer_types = relationship(
        "TaskPerformerType",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    insurance = relationship(
        "TaskInsurance",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    notes = relationship(
        "TaskNote",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    relevant_history = relationship(
        "TaskRelevantHistory",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    restriction_recipients = relationship(
        "TaskRestrictionRecipient",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    inputs = relationship(
        "TaskInput",
        back_populates="task",
        cascade="all, delete-orphan",
    )
    outputs = relationship(
        "TaskOutput",
        back_populates="task",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class TaskIdentifier(Base):
    __tablename__ = "task_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(String, nullable=True)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)
    system = Column(String, nullable=True)
    value = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    assigner = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# basedOn (0..*) — open reference child table
# ---------------------------------------------------------------------------


class TaskBasedOn(Base):
    __tablename__ = "task_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="based_on")


# ---------------------------------------------------------------------------
# partOf (0..*) — Reference(Task) closed
# ---------------------------------------------------------------------------


class TaskPartOf(Base):
    __tablename__ = "task_part_of"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(TaskPartOfReferenceType, name="task_part_of_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="part_of")


# ---------------------------------------------------------------------------
# performerType (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class TaskPerformerType(Base):
    __tablename__ = "task_performer_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="performer_types")


# ---------------------------------------------------------------------------
# insurance (0..*) — Reference(Coverage|ClaimResponse) closed
# ---------------------------------------------------------------------------


class TaskInsurance(Base):
    __tablename__ = "task_insurance"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(TaskInsuranceReferenceType, name="task_insurance_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="insurance")


# ---------------------------------------------------------------------------
# note (0..*) — Annotation child table
# ---------------------------------------------------------------------------


class TaskNote(Base):
    __tablename__ = "task_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(String, nullable=True)
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="notes")


# ---------------------------------------------------------------------------
# relevantHistory (0..*) — Reference(Provenance) closed
# ---------------------------------------------------------------------------


class TaskRelevantHistory(Base):
    __tablename__ = "task_relevant_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(TaskRelevantHistoryReferenceType, name="task_relevant_history_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="relevant_history")


# ---------------------------------------------------------------------------
# restriction.recipient (0..*) — closed reference child table
# ---------------------------------------------------------------------------


class TaskRestrictionRecipient(Base):
    __tablename__ = "task_restriction_recipient"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(
            TaskRestrictionRecipientReferenceType,
            name="task_restriction_recipient_reference_type",
        ),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="restriction_recipients")


# ---------------------------------------------------------------------------
# input (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class TaskInput(Base):
    __tablename__ = "task_input"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # value[x] — practical subset of the 50 allowed types
    value_boolean = Column(Boolean, nullable=True)
    value_code = Column(String, nullable=True)
    value_date = Column(Date, nullable=True)
    value_date_time = Column(DateTime(timezone=True), nullable=True)
    value_decimal = Column(Numeric, nullable=True)
    value_integer = Column(Integer, nullable=True)
    value_string = Column(String, nullable=True)
    value_uri = Column(String, nullable=True)
    value_reference_type = Column(String, nullable=True)   # open
    value_reference_id = Column(Integer, nullable=True)
    value_reference_display = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="inputs")


# ---------------------------------------------------------------------------
# output (0..*) — BackboneElement child table (same shape as input)
# ---------------------------------------------------------------------------


class TaskOutput(Base):
    __tablename__ = "task_output"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("task.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # value[x] — practical subset of the 50 allowed types
    value_boolean = Column(Boolean, nullable=True)
    value_code = Column(String, nullable=True)
    value_date = Column(Date, nullable=True)
    value_date_time = Column(DateTime(timezone=True), nullable=True)
    value_decimal = Column(Numeric, nullable=True)
    value_integer = Column(Integer, nullable=True)
    value_string = Column(String, nullable=True)
    value_uri = Column(String, nullable=True)
    value_reference_type = Column(String, nullable=True)   # open
    value_reference_id = Column(Integer, nullable=True)
    value_reference_display = Column(String, nullable=True)

    task = relationship("TaskModel", back_populates="outputs")
