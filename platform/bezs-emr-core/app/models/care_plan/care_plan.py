from sqlalchemy import (
    Boolean,
    Column,
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
from app.models.care_plan.enums import (
    CarePlanActivityReferenceType,
    CarePlanAddressesReferenceType,
    CarePlanAuthorReferenceType,
    CarePlanBasedOnReferenceType,
    CarePlanCareTeamReferenceType,
    CarePlanContributorReferenceType,
    CarePlanDetailActivityStatus,
    CarePlanDetailGoalReferenceType,
    CarePlanDetailLocationReferenceType,
    CarePlanDetailPerformerReferenceType,
    CarePlanDetailProductReferenceType,
    CarePlanDetailReasonReferenceType,
    CarePlanGoalReferenceType,
    CarePlanIntent,
    CarePlanPartOfReferenceType,
    CarePlanReplacesReferenceType,
    CarePlanBasedOnReferenceType,
    CarePlanStatus,
    CarePlanSubjectReferenceType,
)

care_plan_id_seq = Sequence("care_plan_pub_seq", start=290000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class CarePlanModel(Base):
    __tablename__ = "care_plan"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    care_plan_id = Column(
        Integer,
        care_plan_id_seq,
        server_default=care_plan_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── status (1..1 code) ────────────────────────────────────────────────────
    status = Column(Enum(CarePlanStatus, name="care_plan_status"), nullable=False)

    # ── intent (1..1 code) ───────────────────────────────────────────────────
    intent = Column(Enum(CarePlanIntent, name="care_plan_intent"), nullable=False)

    # ── title (0..1 string) ───────────────────────────────────────────────────
    title = Column(String, nullable=True)

    # ── description (0..1 string) ─────────────────────────────────────────────
    description = Column(String, nullable=True)

    # ── subject (1..1 Reference(Patient|Group)) ───────────────────────────────
    subject_type = Column(
        Enum(CarePlanSubjectReferenceType, name="care_plan_subject_reference_type"),
        nullable=True,
    )
    subject_id = Column(Integer, nullable=True)
    subject_display = Column(String, nullable=True)

    # ── encounter (0..1 Reference(Encounter) — shared enum) ──────────────────
    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, nullable=True)
    encounter_display = Column(String, nullable=True)

    # ── period (0..1 Period) ─────────────────────────────────────────────────
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # ── created (0..1 dateTime) ───────────────────────────────────────────────
    created = Column(DateTime(timezone=True), nullable=True)

    # ── author (0..1 Reference — closed) ─────────────────────────────────────
    author_type = Column(
        Enum(CarePlanAuthorReferenceType, name="care_plan_author_reference_type"),
        nullable=True,
    )
    author_id = Column(Integer, nullable=True)
    author_display = Column(String, nullable=True)

    # ── instantiatesCanonical / instantiatesUri (0..*) — comma-separated ─────
    instantiates_canonical = Column(Text, nullable=True)
    instantiates_uri = Column(Text, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    identifiers = relationship("CarePlanIdentifier", back_populates="care_plan", cascade="all, delete-orphan")
    based_on = relationship("CarePlanBasedOn", back_populates="care_plan", cascade="all, delete-orphan")
    replaces = relationship("CarePlanReplaces", back_populates="care_plan", cascade="all, delete-orphan")
    part_of = relationship("CarePlanPartOf", back_populates="care_plan", cascade="all, delete-orphan")
    categories = relationship("CarePlanCategory", back_populates="care_plan", cascade="all, delete-orphan")
    contributors = relationship("CarePlanContributor", back_populates="care_plan", cascade="all, delete-orphan")
    care_teams = relationship("CarePlanCareTeam", back_populates="care_plan", cascade="all, delete-orphan")
    addresses = relationship("CarePlanAddresses", back_populates="care_plan", cascade="all, delete-orphan")
    supporting_info = relationship("CarePlanSupportingInfo", back_populates="care_plan", cascade="all, delete-orphan")
    goals = relationship("CarePlanGoal", back_populates="care_plan", cascade="all, delete-orphan")
    activities = relationship("CarePlanActivity", back_populates="care_plan", cascade="all, delete-orphan")
    notes = relationship("CarePlanNote", back_populates="care_plan", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class CarePlanIdentifier(Base):
    __tablename__ = "care_plan_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
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

    care_plan = relationship("CarePlanModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# basedOn (0..*) — Reference(CarePlan) child table
# ---------------------------------------------------------------------------


class CarePlanBasedOn(Base):
    __tablename__ = "care_plan_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanBasedOnReferenceType, name="care_plan_based_on_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="based_on")


# ---------------------------------------------------------------------------
# replaces (0..*) — Reference(CarePlan) child table
# ---------------------------------------------------------------------------


class CarePlanReplaces(Base):
    __tablename__ = "care_plan_replaces"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanReplacesReferenceType, name="care_plan_replaces_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="replaces")


# ---------------------------------------------------------------------------
# partOf (0..*) — Reference(CarePlan) child table
# ---------------------------------------------------------------------------


class CarePlanPartOf(Base):
    __tablename__ = "care_plan_part_of"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanPartOfReferenceType, name="care_plan_part_of_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="part_of")


# ---------------------------------------------------------------------------
# category (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class CarePlanCategory(Base):
    __tablename__ = "care_plan_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="categories")


# ---------------------------------------------------------------------------
# contributor (0..*) — closed Reference child table
# ---------------------------------------------------------------------------


class CarePlanContributor(Base):
    __tablename__ = "care_plan_contributor"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanContributorReferenceType, name="care_plan_contributor_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="contributors")


# ---------------------------------------------------------------------------
# careTeam (0..*) — Reference(CareTeam) child table
# ---------------------------------------------------------------------------


class CarePlanCareTeam(Base):
    __tablename__ = "care_plan_care_team"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanCareTeamReferenceType, name="care_plan_care_team_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="care_teams")


# ---------------------------------------------------------------------------
# addresses (0..*) — Reference(Condition) child table
# ---------------------------------------------------------------------------


class CarePlanAddresses(Base):
    __tablename__ = "care_plan_addresses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanAddressesReferenceType, name="care_plan_addresses_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="addresses")


# ---------------------------------------------------------------------------
# supportingInfo (0..*) — open Reference child table
# ---------------------------------------------------------------------------


class CarePlanSupportingInfo(Base):
    __tablename__ = "care_plan_supporting_info"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="supporting_info")


# ---------------------------------------------------------------------------
# goal (0..*) — Reference(Goal) child table
# ---------------------------------------------------------------------------


class CarePlanGoal(Base):
    __tablename__ = "care_plan_goal"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanGoalReferenceType, name="care_plan_goal_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="goals")


# ---------------------------------------------------------------------------
# note (0..*) — Annotation child table
# ---------------------------------------------------------------------------


class CarePlanNote(Base):
    __tablename__ = "care_plan_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(String, nullable=True)
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="notes")


# ---------------------------------------------------------------------------
# activity (0..*) — BackboneElement child table
# activity.detail (0..1) — flat on this table
# ---------------------------------------------------------------------------


class CarePlanActivity(Base):
    __tablename__ = "care_plan_activity"

    id = Column(Integer, primary_key=True, autoincrement=True)
    care_plan_id = Column(Integer, ForeignKey("care_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # ── activity.reference (0..1 Reference — closed) ──────────────────────────
    reference_type = Column(
        Enum(CarePlanActivityReferenceType, name="care_plan_activity_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    # ── activity.detail (0..1 BackboneElement — flat) ─────────────────────────

    # detail.kind (0..1 code)
    detail_kind = Column(String, nullable=True)

    # detail.instantiatesCanonical / instantiatesUri (0..*) — comma-separated
    detail_instantiates_canonical = Column(Text, nullable=True)
    detail_instantiates_uri = Column(Text, nullable=True)

    # detail.code (0..1 CodeableConcept)
    detail_code_system = Column(String, nullable=True)
    detail_code_code = Column(String, nullable=True)
    detail_code_display = Column(String, nullable=True)
    detail_code_text = Column(String, nullable=True)

    # detail.status (1..1 code — required when detail present)
    detail_status = Column(
        Enum(CarePlanDetailActivityStatus, name="care_plan_detail_activity_status"),
        nullable=True,
    )

    # detail.statusReason (0..1 CodeableConcept)
    detail_status_reason_system = Column(String, nullable=True)
    detail_status_reason_code = Column(String, nullable=True)
    detail_status_reason_display = Column(String, nullable=True)
    detail_status_reason_text = Column(String, nullable=True)

    # detail.doNotPerform (0..1 boolean)
    detail_do_not_perform = Column(Boolean, nullable=True)

    # detail.scheduled[x] — scheduledTiming variant (simplified)
    detail_scheduled_timing_event = Column(Text, nullable=True)          # comma-separated datetimes
    detail_scheduled_timing_code_system = Column(String, nullable=True)
    detail_scheduled_timing_code_code = Column(String, nullable=True)
    detail_scheduled_timing_code_display = Column(String, nullable=True)
    detail_scheduled_timing_code_text = Column(String, nullable=True)
    detail_scheduled_timing_repeat_count = Column(Integer, nullable=True)
    detail_scheduled_timing_repeat_count_max = Column(Integer, nullable=True)
    detail_scheduled_timing_repeat_duration = Column(Numeric, nullable=True)
    detail_scheduled_timing_repeat_duration_max = Column(Numeric, nullable=True)
    detail_scheduled_timing_repeat_duration_unit = Column(String, nullable=True)
    detail_scheduled_timing_repeat_frequency = Column(Integer, nullable=True)
    detail_scheduled_timing_repeat_frequency_max = Column(Integer, nullable=True)
    detail_scheduled_timing_repeat_period = Column(Numeric, nullable=True)
    detail_scheduled_timing_repeat_period_max = Column(Numeric, nullable=True)
    detail_scheduled_timing_repeat_period_unit = Column(String, nullable=True)
    detail_scheduled_timing_repeat_day_of_week = Column(Text, nullable=True)   # comma-separated
    detail_scheduled_timing_repeat_time_of_day = Column(Text, nullable=True)   # comma-separated
    detail_scheduled_timing_repeat_when = Column(Text, nullable=True)          # comma-separated
    detail_scheduled_timing_repeat_offset = Column(Integer, nullable=True)
    detail_scheduled_timing_repeat_bounds_start = Column(DateTime(timezone=True), nullable=True)
    detail_scheduled_timing_repeat_bounds_end = Column(DateTime(timezone=True), nullable=True)

    # detail.scheduled[x] — scheduledPeriod variant
    detail_scheduled_period_start = Column(DateTime(timezone=True), nullable=True)
    detail_scheduled_period_end = Column(DateTime(timezone=True), nullable=True)

    # detail.scheduled[x] — scheduledString variant
    detail_scheduled_string = Column(String, nullable=True)

    # detail.location (0..1 Reference(Location))
    detail_location_type = Column(
        Enum(CarePlanDetailLocationReferenceType, name="care_plan_detail_location_reference_type"),
        nullable=True,
    )
    detail_location_id = Column(Integer, nullable=True)
    detail_location_display = Column(String, nullable=True)

    # detail.product[x] — CodeableConcept variant
    detail_product_codeable_concept_system = Column(String, nullable=True)
    detail_product_codeable_concept_code = Column(String, nullable=True)
    detail_product_codeable_concept_display = Column(String, nullable=True)
    detail_product_codeable_concept_text = Column(String, nullable=True)

    # detail.product[x] — Reference(Medication|Substance) variant
    detail_product_reference_type = Column(
        Enum(CarePlanDetailProductReferenceType, name="care_plan_detail_product_reference_type"),
        nullable=True,
    )
    detail_product_reference_id = Column(Integer, nullable=True)
    detail_product_reference_display = Column(String, nullable=True)

    # detail.dailyAmount (0..1 SimpleQuantity)
    detail_daily_amount_value = Column(Numeric, nullable=True)
    detail_daily_amount_unit = Column(String, nullable=True)
    detail_daily_amount_system = Column(String, nullable=True)
    detail_daily_amount_code = Column(String, nullable=True)

    # detail.quantity (0..1 SimpleQuantity)
    detail_quantity_value = Column(Numeric, nullable=True)
    detail_quantity_unit = Column(String, nullable=True)
    detail_quantity_system = Column(String, nullable=True)
    detail_quantity_code = Column(String, nullable=True)

    # detail.description (0..1 string)
    detail_description = Column(String, nullable=True)

    care_plan = relationship("CarePlanModel", back_populates="activities")

    # grandchild relationships
    outcome_codeable_concepts = relationship(
        "CarePlanActivityOutcomeCC", back_populates="activity", cascade="all, delete-orphan"
    )
    outcome_references = relationship(
        "CarePlanActivityOutcomeRef", back_populates="activity", cascade="all, delete-orphan"
    )
    progress = relationship(
        "CarePlanActivityProgress", back_populates="activity", cascade="all, delete-orphan"
    )
    detail_reason_codes = relationship(
        "CarePlanActivityDetailReasonCode", back_populates="activity", cascade="all, delete-orphan"
    )
    detail_reason_references = relationship(
        "CarePlanActivityDetailReasonRef", back_populates="activity", cascade="all, delete-orphan"
    )
    detail_goals = relationship(
        "CarePlanActivityDetailGoal", back_populates="activity", cascade="all, delete-orphan"
    )
    detail_performers = relationship(
        "CarePlanActivityDetailPerformer", back_populates="activity", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# activity.outcomeCodeableConcept (0..*) — grandchild CodeableConcept table
# ---------------------------------------------------------------------------


class CarePlanActivityOutcomeCC(Base):
    __tablename__ = "care_plan_activity_outcome_cc"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("care_plan_activity.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    activity = relationship("CarePlanActivity", back_populates="outcome_codeable_concepts")


# ---------------------------------------------------------------------------
# activity.outcomeReference (0..*) — grandchild open Reference table
# ---------------------------------------------------------------------------


class CarePlanActivityOutcomeRef(Base):
    __tablename__ = "care_plan_activity_outcome_ref"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("care_plan_activity.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    activity = relationship("CarePlanActivity", back_populates="outcome_references")


# ---------------------------------------------------------------------------
# activity.progress (0..*) — grandchild Annotation table
# ---------------------------------------------------------------------------


class CarePlanActivityProgress(Base):
    __tablename__ = "care_plan_activity_progress"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("care_plan_activity.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(String, nullable=True)
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    activity = relationship("CarePlanActivity", back_populates="progress")


# ---------------------------------------------------------------------------
# activity.detail.reasonCode (0..*) — grandchild CodeableConcept table
# ---------------------------------------------------------------------------


class CarePlanActivityDetailReasonCode(Base):
    __tablename__ = "care_plan_activity_detail_reason_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("care_plan_activity.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    activity = relationship("CarePlanActivity", back_populates="detail_reason_codes")


# ---------------------------------------------------------------------------
# activity.detail.reasonReference (0..*) — grandchild closed Reference table
# ---------------------------------------------------------------------------


class CarePlanActivityDetailReasonRef(Base):
    __tablename__ = "care_plan_activity_detail_reason_ref"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("care_plan_activity.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanDetailReasonReferenceType, name="care_plan_detail_reason_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    activity = relationship("CarePlanActivity", back_populates="detail_reason_references")


# ---------------------------------------------------------------------------
# activity.detail.goal (0..*) — grandchild Reference(Goal) table
# ---------------------------------------------------------------------------


class CarePlanActivityDetailGoal(Base):
    __tablename__ = "care_plan_activity_detail_goal"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("care_plan_activity.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanDetailGoalReferenceType, name="care_plan_detail_goal_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    activity = relationship("CarePlanActivity", back_populates="detail_goals")


# ---------------------------------------------------------------------------
# activity.detail.performer (0..*) — grandchild closed Reference table
# ---------------------------------------------------------------------------


class CarePlanActivityDetailPerformer(Base):
    __tablename__ = "care_plan_activity_detail_performer"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, ForeignKey("care_plan_activity.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CarePlanDetailPerformerReferenceType, name="care_plan_detail_performer_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    activity = relationship("CarePlanActivity", back_populates="detail_performers")
