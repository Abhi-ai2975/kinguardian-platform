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
from app.models.allergy_intolerance.enums import (
    AllergyIntoleranceCategoryCode,
    AllergyIntoleranceCriticality,
    AllergyIntoleranceParticipantReferenceType,
    AllergyIntolerancePatientReferenceType,
    AllergyIntoleranceReactionSeverity,
    AllergyIntoleranceType,
)

allergy_intolerance_id_seq = Sequence(
    "allergy_intolerance_pub_seq", start=260000, increment=1, metadata=Base.metadata
)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class AllergyIntoleranceModel(Base):
    __tablename__ = "allergy_intolerance"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID
    allergy_intolerance_id = Column(
        Integer,
        allergy_intolerance_id_seq,
        server_default=allergy_intolerance_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── clinicalStatus (0..1 CodeableConcept) ─────────────────────────────────

    clinical_status_system = Column(String, nullable=True)
    clinical_status_code = Column(String, nullable=True)
    clinical_status_display = Column(String, nullable=True)
    clinical_status_text = Column(String, nullable=True)

    # ── verificationStatus (0..1 CodeableConcept) ─────────────────────────────

    verification_status_system = Column(String, nullable=True)
    verification_status_code = Column(String, nullable=True)
    verification_status_display = Column(String, nullable=True)
    verification_status_text = Column(String, nullable=True)

    # ── type (0..1 code) ──────────────────────────────────────────────────────

    type = Column(
        Enum(AllergyIntoleranceType, name="allergy_intolerance_type"),
        nullable=True,
    )

    # ── criticality (0..1 code) ───────────────────────────────────────────────

    criticality = Column(
        Enum(AllergyIntoleranceCriticality, name="allergy_intolerance_criticality"),
        nullable=True,
    )

    # ── code (0..1 CodeableConcept) ───────────────────────────────────────────

    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # ── patient (1..1 Reference(Patient)) ────────────────────────────────────

    patient_type = Column(
        Enum(AllergyIntolerancePatientReferenceType, name="allergy_intolerance_patient_reference_type"),
        nullable=False,
    )
    patient_id = Column(Integer, nullable=False)
    patient_display = Column(String, nullable=True)

    # ── encounter (0..1 Reference(Encounter)) ─────────────────────────────────

    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, nullable=True)
    encounter_display = Column(String, nullable=True)

    # ── onset[x] (0..1 choice type) ──────────────────────────────────────────

    # dateTime variant
    onset_date_time = Column(DateTime(timezone=True), nullable=True)

    # Age variant (Quantity-like: value, comparator, unit, system, code)
    onset_age_value = Column(Numeric(18, 4), nullable=True)
    onset_age_comparator = Column(String, nullable=True)
    onset_age_unit = Column(String, nullable=True)
    onset_age_system = Column(String, nullable=True)
    onset_age_code = Column(String, nullable=True)

    # Period variant
    onset_period_start = Column(DateTime(timezone=True), nullable=True)
    onset_period_end = Column(DateTime(timezone=True), nullable=True)

    # Range variant (low SimpleQuantity + high SimpleQuantity)
    onset_range_low_value = Column(Numeric(18, 4), nullable=True)
    onset_range_low_unit = Column(String, nullable=True)
    onset_range_low_system = Column(String, nullable=True)
    onset_range_low_code = Column(String, nullable=True)
    onset_range_high_value = Column(Numeric(18, 4), nullable=True)
    onset_range_high_unit = Column(String, nullable=True)
    onset_range_high_system = Column(String, nullable=True)
    onset_range_high_code = Column(String, nullable=True)

    # string variant
    onset_string = Column(String, nullable=True)

    # ── recordedDate (0..1 dateTime) ──────────────────────────────────────────

    recorded_date = Column(DateTime(timezone=True), nullable=True)

    # ── recorder (0..1 Reference(Practitioner|PractitionerRole|Patient|RelatedPerson))

    recorder_type = Column(
        Enum(
            AllergyIntoleranceParticipantReferenceType,
            name="allergy_intolerance_participant_reference_type",
        ),
        nullable=True,
    )
    recorder_id = Column(Integer, nullable=True)
    recorder_display = Column(String, nullable=True)

    # ── asserter (0..1 Reference — same allowed types as recorder) ────────────

    asserter_type = Column(
        Enum(
            AllergyIntoleranceParticipantReferenceType,
            name="allergy_intolerance_participant_reference_type",
            create_type=False,
        ),
        nullable=True,
    )
    asserter_id = Column(Integer, nullable=True)
    asserter_display = Column(String, nullable=True)

    # ── lastOccurrence (0..1 dateTime) ────────────────────────────────────────

    last_occurrence = Column(DateTime(timezone=True), nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    identifiers = relationship(
        "AllergyIntoleranceIdentifier",
        back_populates="allergy_intolerance",
        cascade="all, delete-orphan",
    )
    categories = relationship(
        "AllergyIntoleranceCategory",
        back_populates="allergy_intolerance",
        cascade="all, delete-orphan",
    )
    notes = relationship(
        "AllergyIntoleranceNote",
        back_populates="allergy_intolerance",
        cascade="all, delete-orphan",
    )
    reactions = relationship(
        "AllergyIntoleranceReaction",
        back_populates="allergy_intolerance",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class AllergyIntoleranceIdentifier(Base):
    __tablename__ = "allergy_intolerance_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    allergy_intolerance_id = Column(
        Integer, ForeignKey("allergy_intolerance.id"), nullable=False, index=True
    )
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

    allergy_intolerance = relationship("AllergyIntoleranceModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# category (0..*) — code child table
# ---------------------------------------------------------------------------


class AllergyIntoleranceCategory(Base):
    """category[] — food | medication | environment | biologic."""

    __tablename__ = "allergy_intolerance_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    allergy_intolerance_id = Column(
        Integer, ForeignKey("allergy_intolerance.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    category = Column(
        Enum(AllergyIntoleranceCategoryCode, name="allergy_intolerance_category_code"),
        nullable=False,
    )

    allergy_intolerance = relationship("AllergyIntoleranceModel", back_populates="categories")


# ---------------------------------------------------------------------------
# note (0..*) — Annotation child table
# ---------------------------------------------------------------------------


class AllergyIntoleranceNote(Base):
    """note[] — Annotation on the AllergyIntolerance."""

    __tablename__ = "allergy_intolerance_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    allergy_intolerance_id = Column(
        Integer, ForeignKey("allergy_intolerance.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)
    author_string = Column(String, nullable=True)
    # author[x] Reference — open set (Practitioner|Patient|RelatedPerson|Organization)
    author_reference_type = Column(String, nullable=True)
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    allergy_intolerance = relationship("AllergyIntoleranceModel", back_populates="notes")


# ---------------------------------------------------------------------------
# reaction (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class AllergyIntoleranceReaction(Base):
    """reaction[] — BackboneElement adverse reaction event linked to exposure.

    Fields:
      - substance     (0..1 CodeableConcept)
      - manifestation (1..*) — grandchild table
      - description   (0..1 string)
      - onset         (0..1 dateTime)
      - severity      (0..1 code)
      - exposureRoute (0..1 CodeableConcept)
      - note          (0..*) — grandchild Annotation table
    """

    __tablename__ = "allergy_intolerance_reaction"

    id = Column(Integer, primary_key=True, autoincrement=True)
    allergy_intolerance_id = Column(
        Integer, ForeignKey("allergy_intolerance.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # substance (0..1 CodeableConcept)
    substance_system = Column(String, nullable=True)
    substance_code = Column(String, nullable=True)
    substance_display = Column(String, nullable=True)
    substance_text = Column(String, nullable=True)

    description = Column(String, nullable=True)
    onset = Column(DateTime(timezone=True), nullable=True)

    severity = Column(
        Enum(AllergyIntoleranceReactionSeverity, name="allergy_intolerance_reaction_severity"),
        nullable=True,
    )

    # exposureRoute (0..1 CodeableConcept)
    exposure_route_system = Column(String, nullable=True)
    exposure_route_code = Column(String, nullable=True)
    exposure_route_display = Column(String, nullable=True)
    exposure_route_text = Column(String, nullable=True)

    allergy_intolerance = relationship("AllergyIntoleranceModel", back_populates="reactions")

    manifestations = relationship(
        "AllergyIntoleranceReactionManifestation",
        back_populates="reaction",
        cascade="all, delete-orphan",
    )
    reaction_notes = relationship(
        "AllergyIntoleranceReactionNote",
        back_populates="reaction",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# reaction.manifestation (1..*) — CodeableConcept grandchild table
# ---------------------------------------------------------------------------


class AllergyIntoleranceReactionManifestation(Base):
    """reaction.manifestation[] — CodeableConcept clinical symptoms/signs."""

    __tablename__ = "allergy_intolerance_reaction_manifestation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reaction_id = Column(
        Integer, ForeignKey("allergy_intolerance_reaction.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    reaction = relationship("AllergyIntoleranceReaction", back_populates="manifestations")


# ---------------------------------------------------------------------------
# reaction.note (0..*) — Annotation grandchild table
# ---------------------------------------------------------------------------


class AllergyIntoleranceReactionNote(Base):
    """reaction.note[] — Annotation on individual reaction events."""

    __tablename__ = "allergy_intolerance_reaction_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    reaction_id = Column(
        Integer, ForeignKey("allergy_intolerance_reaction.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(String, nullable=True)
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    reaction = relationship("AllergyIntoleranceReaction", back_populates="reaction_notes")
