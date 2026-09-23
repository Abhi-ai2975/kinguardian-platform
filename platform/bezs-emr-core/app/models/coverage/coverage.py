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
from app.models.coverage.enums import (
    CoverageBeneficiaryReferenceType,
    CoverageContractReferenceType,
    CoveragePayorReferenceType,
    CoveragePolicyHolderReferenceType,
    CoverageStatus,
    CoverageSubscriberReferenceType,
)

coverage_id_seq = Sequence("coverage_pub_seq", start=240000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class CoverageModel(Base):
    __tablename__ = "coverage"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    coverage_id = Column(
        Integer,
        coverage_id_seq,
        server_default=coverage_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── status (1..1 code) ────────────────────────────────────────────────────

    status = Column(
        Enum(CoverageStatus, name="coverage_status"),
        nullable=False,
    )

    # ── type (0..1 CodeableConcept) ───────────────────────────────────────────

    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # ── policyHolder (0..1 Reference(Patient|RelatedPerson|Organization)) ────

    policy_holder_type = Column(
        Enum(CoveragePolicyHolderReferenceType, name="coverage_policy_holder_reference_type"),
        nullable=True,
    )
    policy_holder_id = Column(Integer, nullable=True)
    policy_holder_display = Column(String, nullable=True)

    # ── subscriber (0..1 Reference(Patient|RelatedPerson)) ───────────────────

    subscriber_type = Column(
        Enum(CoverageSubscriberReferenceType, name="coverage_subscriber_reference_type"),
        nullable=True,
    )
    subscriber_id = Column(Integer, nullable=True)
    subscriber_display = Column(String, nullable=True)

    # ── subscriberId (0..1 string) — insurer-assigned subscriber ID ──────────
    # Named subscriber_id_value to avoid collision with subscriber_id reference column

    subscriber_id_value = Column(String, nullable=True)

    # ── beneficiary (1..1 Reference(Patient)) ────────────────────────────────

    beneficiary_type = Column(
        Enum(CoverageBeneficiaryReferenceType, name="coverage_beneficiary_reference_type"),
        nullable=False,
    )
    beneficiary_id = Column(Integer, nullable=False)
    beneficiary_display = Column(String, nullable=True)

    # ── dependent (0..1 string) ───────────────────────────────────────────────

    dependent = Column(String, nullable=True)

    # ── relationship (0..1 CodeableConcept) ───────────────────────────────────

    relationship_system = Column(String, nullable=True)
    relationship_code = Column(String, nullable=True)
    relationship_display = Column(String, nullable=True)
    relationship_text = Column(String, nullable=True)

    # ── period (0..1 Period) ──────────────────────────────────────────────────

    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # ── order (0..1 positiveInt) ──────────────────────────────────────────────

    order = Column(Integer, nullable=True)

    # ── network (0..1 string) ─────────────────────────────────────────────────

    network = Column(String, nullable=True)

    # ── subrogation (0..1 boolean) ────────────────────────────────────────────

    subrogation = Column(Boolean, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    identifiers = relationship(
        "CoverageIdentifier",
        back_populates="coverage",
        cascade="all, delete-orphan",
    )
    payors = relationship(
        "CoveragePayor",
        back_populates="coverage",
        cascade="all, delete-orphan",
    )
    classes = relationship(
        "CoverageClass",
        back_populates="coverage",
        cascade="all, delete-orphan",
    )
    cost_to_beneficiaries = relationship(
        "CoverageCostToBeneficiary",
        back_populates="coverage",
        cascade="all, delete-orphan",
    )
    contracts = relationship(
        "CoverageContract",
        back_populates="coverage",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class CoverageIdentifier(Base):
    """identifier[] — business identifiers for this coverage."""

    __tablename__ = "coverage_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coverage_id = Column(Integer, ForeignKey("coverage.id"), nullable=False, index=True)
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

    coverage = relationship("CoverageModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# payor (1..*) — Reference child table
# ---------------------------------------------------------------------------


class CoveragePayor(Base):
    """payor[] — Reference(Organization|Patient|RelatedPerson) plan underwriter."""

    __tablename__ = "coverage_payor"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coverage_id = Column(Integer, ForeignKey("coverage.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CoveragePayorReferenceType, name="coverage_payor_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    coverage = relationship("CoverageModel", back_populates="payors")


# ---------------------------------------------------------------------------
# class (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class CoverageClass(Base):
    """class[] — BackboneElement grouping tiers (group, plan, subplan, etc.).

    BackboneElement fields:
      - type   (1..1 CodeableConcept) coverage class category
      - value  (1..1 string)          insurer-issued label value
      - name   (0..1 string)          human-readable class description
    """

    __tablename__ = "coverage_class"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coverage_id = Column(Integer, ForeignKey("coverage.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # value (1..1 string) — required
    value = Column(String, nullable=False)

    # name (0..1 string)
    name = Column(String, nullable=True)

    coverage = relationship("CoverageModel", back_populates="classes")


# ---------------------------------------------------------------------------
# costToBeneficiary (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class CoverageCostToBeneficiary(Base):
    """costToBeneficiary[] — BackboneElement patient cost category and amount.

    BackboneElement fields:
      - type         (0..1 CodeableConcept) patient cost category
      - value[x]     (1..1 SimpleQuantity | Money) amount/percentage due
        stored as two choice variants — only one non-null at a time:
          quantity variant: value_quantity_value, value_quantity_unit,
                            value_quantity_system, value_quantity_code
          money variant:    value_money_value, value_money_currency
    """

    __tablename__ = "coverage_cost_to_beneficiary"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coverage_id = Column(Integer, ForeignKey("coverage.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (0..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # value[x] — SimpleQuantity variant
    value_quantity_value = Column(Numeric(18, 4), nullable=True)
    value_quantity_unit = Column(String, nullable=True)
    value_quantity_system = Column(String, nullable=True)
    value_quantity_code = Column(String, nullable=True)

    # value[x] — Money variant
    value_money_value = Column(Numeric(18, 4), nullable=True)
    value_money_currency = Column(String, nullable=True)

    coverage = relationship("CoverageModel", back_populates="cost_to_beneficiaries")

    exceptions = relationship(
        "CoverageCostToBeneficiaryException",
        back_populates="cost_to_beneficiary",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# costToBeneficiary.exception (0..*) — grandchild BackboneElement table
# ---------------------------------------------------------------------------


class CoverageCostToBeneficiaryException(Base):
    """costToBeneficiary.exception[] — specific exception to the benefit period.

    BackboneElement fields:
      - type    (1..1 CodeableConcept) specific exception code
      - period  (0..1 Period)          exception effective timeframe
    """

    __tablename__ = "coverage_cost_to_beneficiary_exception"

    id = Column(Integer, primary_key=True, autoincrement=True)
    cost_to_beneficiary_id = Column(
        Integer, ForeignKey("coverage_cost_to_beneficiary.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # type (1..1 CodeableConcept) — required
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # period (0..1 Period)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    cost_to_beneficiary = relationship(
        "CoverageCostToBeneficiary", back_populates="exceptions"
    )


# ---------------------------------------------------------------------------
# contract (0..*) — Reference(Contract) child table
# ---------------------------------------------------------------------------


class CoverageContract(Base):
    """contract[] — Reference(Contract) constituent policies."""

    __tablename__ = "coverage_contract"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coverage_id = Column(Integer, ForeignKey("coverage.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(CoverageContractReferenceType, name="coverage_contract_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    coverage = relationship("CoverageModel", back_populates="contracts")
