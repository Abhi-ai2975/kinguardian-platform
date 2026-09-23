from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Sequence,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base
from app.models.procedure.enums import (
    ProcedureAsserterType,
    ProcedureBasedOnReferenceType,
    ProcedureComplicationDetailReferenceType,
    ProcedureFocalDeviceManipulatedReferenceType,
    ProcedureLocationReferenceType,
    ProcedureNoteAuthorReferenceType,
    ProcedurePartOfReferenceType,
    ProcedurePerformerActorType,
    ProcedurePerformerOnBehalfOfType,
    ProcedureReasonReferenceType,
    ProcedureRecorderType,
    ProcedureReportReferenceType,
    ProcedureStatus,
    ProcedureSubjectType,
    ProcedureUsedReferenceType,
)
from app.models.enums import EncounterReferenceType

procedure_id_seq = Sequence("procedure_pub_seq", start=100000, increment=1, metadata=Base.metadata)


class ProcedureModel(Base):
    __tablename__ = "procedure"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    procedure_id = Column(
        Integer,
        procedure_id_seq,
        server_default=procedure_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── Required ───────────────────────────────────────────────────────────────

    status = Column(Enum(ProcedureStatus, name="procedure_status"), nullable=False, index=True)

    # ── statusReason (0..1 CodeableConcept) ───────────────────────────────────

    status_reason_system = Column(String, nullable=True)
    status_reason_code = Column(String, nullable=True)
    status_reason_display = Column(String, nullable=True)
    status_reason_text = Column(String, nullable=True)

    # ── category (0..1 CodeableConcept — single in R4) ────────────────────────

    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)

    # ── code (0..1 CodeableConcept — what procedure was performed) ────────────

    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True, index=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # ── subject (1..1 Reference — Patient | Group in R4) ─────────────────────

    subject_type = Column(
        Enum(ProcedureSubjectType, name="procedure_subject_type"), nullable=True
    )
    subject_id = Column(Integer, nullable=True, index=True)
    subject_display = Column(String, nullable=True)

    # ── encounter (0..1 Reference(Encounter)) ─────────────────────────────────

    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=True, index=True)
    encounter_display = Column(String, nullable=True)

    # ── performed[x] (0..1 — dateTime | Period | string | Age | Range) ────────
    # All five variants stored; mapper uses whichever is non-null.

    performed_datetime = Column(DateTime(timezone=True), nullable=True)
    performed_period_start = Column(DateTime(timezone=True), nullable=True)
    performed_period_end = Column(DateTime(timezone=True), nullable=True)
    performed_string = Column(String, nullable=True)

    # performedAge (Age datatype)
    performed_age_value = Column(Float, nullable=True)
    performed_age_unit = Column(String, nullable=True)
    performed_age_system = Column(String, nullable=True)
    performed_age_code = Column(String, nullable=True)

    # performedRange (low/high SimpleQuantity)
    performed_range_low_value = Column(Float, nullable=True)
    performed_range_low_unit = Column(String, nullable=True)
    performed_range_high_value = Column(Float, nullable=True)
    performed_range_high_unit = Column(String, nullable=True)

    # ── recorder (0..1 Reference) ─────────────────────────────────────────────

    recorder_type = Column(
        Enum(ProcedureRecorderType, name="procedure_recorder_type"), nullable=True
    )
    recorder_id = Column(Integer, nullable=True)
    recorder_display = Column(String, nullable=True)

    # ── asserter (0..1 Reference) ─────────────────────────────────────────────

    asserter_type = Column(
        Enum(ProcedureAsserterType, name="procedure_asserter_type"), nullable=True
    )
    asserter_id = Column(Integer, nullable=True)
    asserter_display = Column(String, nullable=True)

    # ── location (0..1 Reference(Location)) ──────────────────────────────────

    location_type = Column(
        Enum(ProcedureLocationReferenceType, name="procedure_location_ref_type"),
        nullable=True,
    )
    location_reference_id = Column(Integer, nullable=True)
    location_display = Column(String, nullable=True)

    # ── outcome (0..1 CodeableConcept) ────────────────────────────────────────

    outcome_system = Column(String, nullable=True)
    outcome_code = Column(String, nullable=True)
    outcome_display = Column(String, nullable=True)
    outcome_text = Column(String, nullable=True)

    # ── instantiates (comma-separated — rarely queried individually) ──────────

    instantiates_canonical = Column(Text, nullable=True)
    instantiates_uri = Column(Text, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    encounter = relationship("EncounterModel", foreign_keys=[encounter_id], lazy="selectin")

    identifiers = relationship(
        "ProcedureIdentifier",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    based_on = relationship(
        "ProcedureBasedOn",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    part_of = relationship(
        "ProcedurePartOf",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    performers = relationship(
        "ProcedurePerformer",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    reason_codes = relationship(
        "ProcedureReasonCode",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    reason_references = relationship(
        "ProcedureReasonReference",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    body_sites = relationship(
        "ProcedureBodySite",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    reports = relationship(
        "ProcedureReport",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    complications = relationship(
        "ProcedureComplication",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    complication_details = relationship(
        "ProcedureComplicationDetail",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    follow_ups = relationship(
        "ProcedureFollowUp",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    notes = relationship(
        "ProcedureNote",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    focal_devices = relationship(
        "ProcedureFocalDevice",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    used_references = relationship(
        "ProcedureUsedReference",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )
    used_codes = relationship(
        "ProcedureUsedCode",
        back_populates="procedure",
        cascade="all, delete-orphan",
    )


# ── Sub-resource tables ────────────────────────────────────────────────────────


class ProcedureIdentifier(Base):
    """identifier[] — business identifiers for this procedure record."""

    __tablename__ = "procedure_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    use = Column(String, nullable=True)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)
    system = Column(String, nullable=True)
    value = Column(String, nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    assigner = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="identifiers")


class ProcedureBasedOn(Base):
    """basedOn[] — Reference(CarePlan|ServiceRequest) that requested this procedure."""

    __tablename__ = "procedure_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ProcedureBasedOnReferenceType, name="procedure_based_on_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="based_on")


class ProcedurePartOf(Base):
    """partOf[] — Reference(Procedure|Observation|MedicationAdministration) this is part of."""

    __tablename__ = "procedure_part_of"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ProcedurePartOfReferenceType, name="procedure_part_of_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="part_of")


class ProcedurePerformer(Base):
    """performer[] BackboneElement — who performed the procedure."""

    __tablename__ = "procedure_performer"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # function (0..1 CodeableConcept)
    function_system = Column(String, nullable=True)
    function_code = Column(String, nullable=True)
    function_display = Column(String, nullable=True)
    function_text = Column(String, nullable=True)

    # actor (1..1 Reference)
    actor_type = Column(
        Enum(ProcedurePerformerActorType, name="procedure_performer_actor_type"),
        nullable=True,
    )
    actor_id = Column(Integer, nullable=True)
    actor_display = Column(String, nullable=True)

    # onBehalfOf (0..1 Reference(Organization))
    on_behalf_of_type = Column(
        Enum(ProcedurePerformerOnBehalfOfType, name="procedure_on_behalf_of_type"),
        nullable=True,
    )
    on_behalf_of_id = Column(Integer, nullable=True)
    on_behalf_of_display = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="performers")


class ProcedureReasonCode(Base):
    """reasonCode[] — coded reason why the procedure was performed."""

    __tablename__ = "procedure_reason_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="reason_codes")


class ProcedureReasonReference(Base):
    """reasonReference[] — Reference(Condition|Observation|Procedure|DiagnosticReport|DocumentReference)."""

    __tablename__ = "procedure_reason_reference"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ProcedureReasonReferenceType, name="procedure_reason_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="reason_references")


class ProcedureBodySite(Base):
    """bodySite[] — anatomical location where the procedure was performed."""

    __tablename__ = "procedure_body_site"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="body_sites")


class ProcedureReport(Base):
    """report[] — Reference(DiagnosticReport|DocumentReference|Composition) resulting from procedure."""

    __tablename__ = "procedure_report"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ProcedureReportReferenceType, name="procedure_report_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="reports")


class ProcedureComplication(Base):
    """complication[] — CodeableConcept complications that occurred during/after the procedure."""

    __tablename__ = "procedure_complication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="complications")


class ProcedureComplicationDetail(Base):
    """complicationDetail[] — Reference(Condition) with full detail of complication."""

    __tablename__ = "procedure_complication_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ProcedureComplicationDetailReferenceType, name="procedure_complication_detail_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="complication_details")


class ProcedureFollowUp(Base):
    """followUp[] — CodeableConcept post-procedure follow-up instructions."""

    __tablename__ = "procedure_follow_up"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="follow_ups")


class ProcedureNote(Base):
    """note[] — Annotation comments about the procedure."""

    __tablename__ = "procedure_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # text (1..1 markdown)
    text = Column(Text, nullable=False)

    # time (0..1 dateTime)
    time = Column(DateTime(timezone=True), nullable=True)

    # author[x] — string | Reference(Practitioner|Patient|RelatedPerson|Organization)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(
        Enum(ProcedureNoteAuthorReferenceType, name="procedure_note_author_ref_type"),
        nullable=True,
    )
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="notes")


class ProcedureFocalDevice(Base):
    """focalDevice[] BackboneElement — device implanted, removed, or manipulated."""

    __tablename__ = "procedure_focal_device"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # action (0..1 CodeableConcept)
    action_system = Column(String, nullable=True)
    action_code = Column(String, nullable=True)
    action_display = Column(String, nullable=True)
    action_text = Column(String, nullable=True)

    # manipulated (1..1 Reference(Device))
    manipulated_reference_type = Column(
        Enum(ProcedureFocalDeviceManipulatedReferenceType, name="procedure_focal_device_ref_type"),
        nullable=True,
    )
    manipulated_reference_id = Column(Integer, nullable=True)
    manipulated_reference_display = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="focal_devices")


class ProcedureUsedReference(Base):
    """usedReference[] — Reference(Device|Medication|Substance) items used during procedure."""

    __tablename__ = "procedure_used_reference"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(ProcedureUsedReferenceType, name="procedure_used_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="used_references")


class ProcedureUsedCode(Base):
    """usedCode[] — CodeableConcept coded items used during the procedure."""

    __tablename__ = "procedure_used_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    procedure_id = Column(
        Integer, ForeignKey("procedure.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    procedure = relationship("ProcedureModel", back_populates="used_codes")
