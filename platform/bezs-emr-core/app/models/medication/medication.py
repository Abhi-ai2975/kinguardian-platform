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
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base
from app.models.enums import OrganizationReferenceType
from app.models.medication.enums import (
    MedicationIngredientItemReferenceType,
    MedicationStatus,
)

medication_id_seq = Sequence("medication_pub_seq", start=250000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class MedicationModel(Base):
    __tablename__ = "medication"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    medication_id = Column(
        Integer,
        medication_id_seq,
        server_default=medication_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── code (0..1 CodeableConcept) ───────────────────────────────────────────

    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # ── status (0..1 code) ────────────────────────────────────────────────────

    status = Column(
        Enum(MedicationStatus, name="medication_status"),
        nullable=True,
    )

    # ── manufacturer (0..1 Reference(Organization)) ───────────────────────────

    manufacturer_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    manufacturer_id = Column(Integer, nullable=True)
    manufacturer_display = Column(String, nullable=True)

    # ── form (0..1 CodeableConcept) ───────────────────────────────────────────

    form_system = Column(String, nullable=True)
    form_code = Column(String, nullable=True)
    form_display = Column(String, nullable=True)
    form_text = Column(String, nullable=True)

    # ── amount (0..1 Ratio) — numerator + denominator Quantity ────────────────

    amount_numerator_value = Column(Numeric(18, 4), nullable=True)
    amount_numerator_unit = Column(String, nullable=True)
    amount_numerator_system = Column(String, nullable=True)
    amount_numerator_code = Column(String, nullable=True)
    amount_denominator_value = Column(Numeric(18, 4), nullable=True)
    amount_denominator_unit = Column(String, nullable=True)
    amount_denominator_system = Column(String, nullable=True)
    amount_denominator_code = Column(String, nullable=True)

    # ── batch (0..1 BackboneElement) — flat cols ──────────────────────────────

    batch_lot_number = Column(String, nullable=True)
    batch_expiration_date = Column(DateTime(timezone=True), nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    identifiers = relationship(
        "MedicationIdentifier",
        back_populates="medication",
        cascade="all, delete-orphan",
    )
    ingredients = relationship(
        "MedicationIngredient",
        back_populates="medication",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class MedicationIdentifier(Base):
    """identifier[] — business identifiers for this medication."""

    __tablename__ = "medication_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_id = Column(Integer, ForeignKey("medication.id"), nullable=False, index=True)
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

    medication = relationship("MedicationModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# ingredient (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class MedicationIngredient(Base):
    """ingredient[] — constituent of interest in the medication product.

    BackboneElement fields:
      - item[x]    (1..1) CodeableConcept | Reference(Substance, Medication)
      - isActive   (0..1) boolean
      - strength   (0..1) Ratio — amount of ingredient per unit
    """

    __tablename__ = "medication_ingredient"

    id = Column(Integer, primary_key=True, autoincrement=True)
    medication_id = Column(Integer, ForeignKey("medication.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # item[x] — CodeableConcept variant
    item_codeable_concept_system = Column(String, nullable=True)
    item_codeable_concept_code = Column(String, nullable=True)
    item_codeable_concept_display = Column(String, nullable=True)
    item_codeable_concept_text = Column(String, nullable=True)

    # item[x] — Reference(Substance | Medication) variant
    item_reference_type = Column(
        Enum(
            MedicationIngredientItemReferenceType,
            name="medication_ingredient_item_reference_type",
        ),
        nullable=True,
    )
    item_reference_id = Column(Integer, nullable=True)
    item_reference_display = Column(String, nullable=True)

    # isActive (0..1 boolean)
    is_active = Column(Boolean, nullable=True)

    # strength (0..1 Ratio) — numerator Quantity
    strength_numerator_value = Column(Numeric(18, 4), nullable=True)
    strength_numerator_unit = Column(String, nullable=True)
    strength_numerator_system = Column(String, nullable=True)
    strength_numerator_code = Column(String, nullable=True)

    # strength (0..1 Ratio) — denominator Quantity
    strength_denominator_value = Column(Numeric(18, 4), nullable=True)
    strength_denominator_unit = Column(String, nullable=True)
    strength_denominator_system = Column(String, nullable=True)
    strength_denominator_code = Column(String, nullable=True)

    medication = relationship("MedicationModel", back_populates="ingredients")
