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
from app.models.condition.enums import (
    ConditionAsserterType,
    ConditionNoteAuthorReferenceType,
    ConditionRecorderType,
    ConditionStageAssessmentType,
    ConditionSubjectType,
)
from app.models.enums import EncounterReferenceType

condition_id_seq = Sequence("condition_pub_seq", start=120000, increment=1, metadata=Base.metadata)


class ConditionModel(Base):
    __tablename__ = "condition"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    condition_id = Column(
        Integer,
        condition_id_seq,
        server_default=condition_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── clinicalStatus (0..1 CodeableConcept, modifier) ───────────────────────
    # Required binding: active|recurrence|relapse|inactive|remission|resolved
    # system = http://terminology.hl7.org/CodeSystem/condition-clinical

    clinical_status_system = Column(String, nullable=True)
    clinical_status_code = Column(String, nullable=True, index=True)
    clinical_status_display = Column(String, nullable=True)
    clinical_status_text = Column(String, nullable=True)

    # ── verificationStatus (0..1 CodeableConcept, modifier) ───────────────────
    # Required binding: unconfirmed|provisional|differential|confirmed|refuted|entered-in-error
    # system = http://terminology.hl7.org/CodeSystem/condition-ver-status

    verification_status_system = Column(String, nullable=True)
    verification_status_code = Column(String, nullable=True, index=True)
    verification_status_display = Column(String, nullable=True)
    verification_status_text = Column(String, nullable=True)

    # ── severity (0..1 CodeableConcept) ───────────────────────────────────────

    severity_system = Column(String, nullable=True)
    severity_code = Column(String, nullable=True)
    severity_display = Column(String, nullable=True)
    severity_text = Column(String, nullable=True)

    # ── code (0..1 CodeableConcept) — the condition, problem, or diagnosis ────

    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True, index=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # ── subject (1..1 Reference — Patient | Group) ────────────────────────────

    subject_type = Column(
        Enum(ConditionSubjectType, name="condition_subject_type"), nullable=True
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

    # ── onset[x] (0..1 — dateTime | Age | Period | Range | string) ───────────
    # All five variants stored; mapper uses whichever set of columns is non-null.

    # onsetDateTime
    onset_datetime = Column(DateTime(timezone=True), nullable=True)

    # onsetAge (Age = Quantity subtype: value, comparator, unit, system, code)
    onset_age_value = Column(Float, nullable=True)
    onset_age_comparator = Column(String, nullable=True)  # < | <= | >= | >
    onset_age_unit = Column(String, nullable=True)
    onset_age_system = Column(String, nullable=True)      # http://unitsofmeasure.org
    onset_age_code = Column(String, nullable=True)        # UCUM: a | mo | wk | d

    # onsetPeriod
    onset_period_start = Column(DateTime(timezone=True), nullable=True)
    onset_period_end = Column(DateTime(timezone=True), nullable=True)

    # onsetRange (low/high as SimpleQuantity — no comparator)
    onset_range_low_value = Column(Float, nullable=True)
    onset_range_low_unit = Column(String, nullable=True)
    onset_range_high_value = Column(Float, nullable=True)
    onset_range_high_unit = Column(String, nullable=True)

    # onsetString
    onset_string = Column(String, nullable=True)

    # ── abatement[x] (0..1 — dateTime | Age | Period | Range | string) ───────
    # Same five variants as onset[x].

    # abatementDateTime
    abatement_datetime = Column(DateTime(timezone=True), nullable=True)

    # abatementAge
    abatement_age_value = Column(Float, nullable=True)
    abatement_age_comparator = Column(String, nullable=True)
    abatement_age_unit = Column(String, nullable=True)
    abatement_age_system = Column(String, nullable=True)
    abatement_age_code = Column(String, nullable=True)

    # abatementPeriod
    abatement_period_start = Column(DateTime(timezone=True), nullable=True)
    abatement_period_end = Column(DateTime(timezone=True), nullable=True)

    # abatementRange
    abatement_range_low_value = Column(Float, nullable=True)
    abatement_range_low_unit = Column(String, nullable=True)
    abatement_range_high_value = Column(Float, nullable=True)
    abatement_range_high_unit = Column(String, nullable=True)

    # abatementString
    abatement_string = Column(String, nullable=True)

    # ── recordedDate (0..1 dateTime) ──────────────────────────────────────────

    recorded_date = Column(DateTime(timezone=True), nullable=True, index=True)

    # ── recorder (0..1 Reference) ─────────────────────────────────────────────

    recorder_type = Column(
        Enum(ConditionRecorderType, name="condition_recorder_type"), nullable=True
    )
    recorder_id = Column(Integer, nullable=True)
    recorder_display = Column(String, nullable=True)

    # ── asserter (0..1 Reference) — who asserts the condition statement ───────

    asserter_type = Column(
        Enum(ConditionAsserterType, name="condition_asserter_type"), nullable=True
    )
    asserter_id = Column(Integer, nullable=True)
    asserter_display = Column(String, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    encounter = relationship("EncounterModel", foreign_keys=[encounter_id], lazy="selectin")

    identifiers = relationship(
        "ConditionIdentifier",
        back_populates="condition",
        cascade="all, delete-orphan",
    )
    categories = relationship(
        "ConditionCategory",
        back_populates="condition",
        cascade="all, delete-orphan",
    )
    body_sites = relationship(
        "ConditionBodySite",
        back_populates="condition",
        cascade="all, delete-orphan",
    )
    stages = relationship(
        "ConditionStage",
        back_populates="condition",
        cascade="all, delete-orphan",
    )
    evidence = relationship(
        "ConditionEvidence",
        back_populates="condition",
        cascade="all, delete-orphan",
    )
    notes = relationship(
        "ConditionNote",
        back_populates="condition",
        cascade="all, delete-orphan",
    )


# ── Sub-resource tables ────────────────────────────────────────────────────────


class ConditionIdentifier(Base):
    """identifier[] — business identifiers for this condition record."""

    __tablename__ = "condition_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    condition_id = Column(
        Integer, ForeignKey("condition.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # Full Identifier spec: use | type | system | value | period | assigner
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

    condition = relationship("ConditionModel", back_populates="identifiers")


class ConditionCategory(Base):
    """category[] — CodeableConcept classifying the condition (problem-list-item | encounter-diagnosis)."""

    __tablename__ = "condition_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    condition_id = Column(
        Integer, ForeignKey("condition.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    condition = relationship("ConditionModel", back_populates="categories")


class ConditionBodySite(Base):
    """bodySite[] — CodeableConcept anatomical location where the condition manifests."""

    __tablename__ = "condition_body_site"

    id = Column(Integer, primary_key=True, autoincrement=True)
    condition_id = Column(
        Integer, ForeignKey("condition.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    condition = relationship("ConditionModel", back_populates="body_sites")


class ConditionStage(Base):
    """stage[] BackboneElement — clinical stage or grade of the condition.

    BackboneElement fields:
      - summary    (0..1 CodeableConcept)  plain summary e.g. 'Stage 3'
      - type       (0..1 CodeableConcept)  kind of staging e.g. pathological | clinical
      - assessment (0..*)                  → grandchild table ConditionStageAssessment
    """

    __tablename__ = "condition_stage"

    id = Column(Integer, primary_key=True, autoincrement=True)
    condition_id = Column(
        Integer, ForeignKey("condition.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # summary (0..1 CodeableConcept)
    summary_system = Column(String, nullable=True)
    summary_code = Column(String, nullable=True)
    summary_display = Column(String, nullable=True)
    summary_text = Column(String, nullable=True)

    # type (0..1 CodeableConcept) — pathological | clinical | etc.
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    condition = relationship("ConditionModel", back_populates="stages")
    assessments = relationship(
        "ConditionStageAssessment",
        back_populates="stage",
        cascade="all, delete-orphan",
    )


class ConditionStageAssessment(Base):
    """stage[].assessment[] — Reference(ClinicalImpression|DiagnosticReport|Observation).

    Grandchild table: 0..* inside the 0..* stage BackboneElement.
    """

    __tablename__ = "condition_stage_assessment"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stage_id = Column(
        Integer, ForeignKey("condition_stage.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # Allowed: ClinicalImpression | DiagnosticReport | Observation
    reference_type = Column(
        Enum(ConditionStageAssessmentType, name="condition_stage_assessment_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    stage = relationship("ConditionStage", back_populates="assessments")


class ConditionEvidence(Base):
    """evidence[] BackboneElement — supporting evidence for the condition (R4 only, removed in R5).

    BackboneElement fields:
      - code   (0..*)  CodeableConcept  → grandchild table ConditionEvidenceCode
      - detail (0..*)  Reference(Any)   → grandchild table ConditionEvidenceDetail
    """

    __tablename__ = "condition_evidence"

    id = Column(Integer, primary_key=True, autoincrement=True)
    condition_id = Column(
        Integer, ForeignKey("condition.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    condition = relationship("ConditionModel", back_populates="evidence")
    codes = relationship(
        "ConditionEvidenceCode",
        back_populates="evidence",
        cascade="all, delete-orphan",
    )
    details = relationship(
        "ConditionEvidenceDetail",
        back_populates="evidence",
        cascade="all, delete-orphan",
    )


class ConditionEvidenceCode(Base):
    """evidence[].code[] — CodeableConcept manifestation/symptom that led to recording the condition.

    Grandchild table: 0..* inside the 0..* evidence BackboneElement.
    """

    __tablename__ = "condition_evidence_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    evidence_id = Column(
        Integer, ForeignKey("condition_evidence.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    evidence = relationship("ConditionEvidence", back_populates="codes")


class ConditionEvidenceDetail(Base):
    """evidence[].detail[] — Reference(Any) links to supporting information (e.g. pathology reports).

    Grandchild table: 0..* inside the 0..* evidence BackboneElement.
    """

    __tablename__ = "condition_evidence_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    evidence_id = Column(
        Integer, ForeignKey("condition_evidence.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # Any FHIR resource type
    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    evidence = relationship("ConditionEvidence", back_populates="details")


class ConditionNote(Base):
    """note[] — Annotation additional information about the condition.

    Annotation structure (per spec):
      - text       (1..1 markdown)   required
      - time       (0..1 dateTime)
      - author[x]  (0..1)            string OR Reference
    """

    __tablename__ = "condition_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    condition_id = Column(
        Integer, ForeignKey("condition.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # text (1..1 markdown) — required
    text = Column(Text, nullable=False)

    # time (0..1 dateTime)
    time = Column(DateTime(timezone=True), nullable=True)

    # author[x] — string variant
    author_string = Column(String, nullable=True)

    # author[x] — Reference variant
    # Allowed: Practitioner | Patient | RelatedPerson | Organization
    author_reference_type = Column(
        Enum(ConditionNoteAuthorReferenceType, name="condition_note_author_ref_type"),
        nullable=True,
    )
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    condition = relationship("ConditionModel", back_populates="notes")
