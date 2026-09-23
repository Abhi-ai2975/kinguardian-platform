from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Numeric, Sequence, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base
from app.models.insurance_plan.enums import InsurancePlanStatus

insurance_plan_id_seq = Sequence("insurance_plan_pub_seq", start=360000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class InsurancePlanModel(Base):
    __tablename__ = "insurance_plan"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    insurance_plan_id = Column(
        Integer,
        insurance_plan_id_seq,
        server_default=insurance_plan_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── status (0..1 code) ────────────────────────────────────────────────────
    status = Column(Enum(InsurancePlanStatus, name="insurance_plan_status"), nullable=True)

    # ── name (0..1 string) ────────────────────────────────────────────────────
    name = Column(String, nullable=True)

    # ── period (0..1 Period) ─────────────────────────────────────────────────
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # ── ownedBy (0..1 Reference(Organization)) — public org sequence ID ──────
    owned_by_id = Column(Integer, nullable=True)
    owned_by_display = Column(String, nullable=True)

    # ── administeredBy (0..1 Reference(Organization)) ────────────────────────
    administered_by_id = Column(Integer, nullable=True)
    administered_by_display = Column(String, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    identifiers = relationship("InsurancePlanIdentifier", back_populates="insurance_plan", cascade="all, delete-orphan")
    types = relationship("InsurancePlanType", back_populates="insurance_plan", cascade="all, delete-orphan")
    aliases = relationship("InsurancePlanAlias", back_populates="insurance_plan", cascade="all, delete-orphan")
    coverage_areas = relationship("InsurancePlanCoverageArea", back_populates="insurance_plan", cascade="all, delete-orphan")
    endpoints = relationship("InsurancePlanEndpoint", back_populates="insurance_plan", cascade="all, delete-orphan")
    networks = relationship("InsurancePlanNetwork", back_populates="insurance_plan", cascade="all, delete-orphan")
    contacts = relationship("InsurancePlanContact", back_populates="insurance_plan", cascade="all, delete-orphan")
    coverages = relationship("InsurancePlanCoverage", back_populates="insurance_plan", cascade="all, delete-orphan")
    plans = relationship("InsurancePlanPlan", back_populates="insurance_plan", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class InsurancePlanIdentifier(Base):
    __tablename__ = "insurance_plan_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_plan_id = Column(Integer, ForeignKey("insurance_plan.id"), nullable=False, index=True)
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

    insurance_plan = relationship("InsurancePlanModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# type (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class InsurancePlanType(Base):
    __tablename__ = "insurance_plan_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_plan_id = Column(Integer, ForeignKey("insurance_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    insurance_plan = relationship("InsurancePlanModel", back_populates="types")


# ---------------------------------------------------------------------------
# alias (0..*) — simple string child table
# ---------------------------------------------------------------------------


class InsurancePlanAlias(Base):
    __tablename__ = "insurance_plan_alias"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_plan_id = Column(Integer, ForeignKey("insurance_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    alias = Column(String, nullable=False)

    insurance_plan = relationship("InsurancePlanModel", back_populates="aliases")


# ---------------------------------------------------------------------------
# coverageArea (0..*) — Reference(Location) child table
# ---------------------------------------------------------------------------


class InsurancePlanCoverageArea(Base):
    __tablename__ = "insurance_plan_coverage_area"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_plan_id = Column(Integer, ForeignKey("insurance_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    insurance_plan = relationship("InsurancePlanModel", back_populates="coverage_areas")


# ---------------------------------------------------------------------------
# endpoint (0..*) — Reference(Endpoint) child table
# ---------------------------------------------------------------------------


class InsurancePlanEndpoint(Base):
    __tablename__ = "insurance_plan_endpoint"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_plan_id = Column(Integer, ForeignKey("insurance_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    insurance_plan = relationship("InsurancePlanModel", back_populates="endpoints")


# ---------------------------------------------------------------------------
# network (0..*) — Reference(Organization) child table
# ---------------------------------------------------------------------------


class InsurancePlanNetwork(Base):
    __tablename__ = "insurance_plan_network"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_plan_id = Column(Integer, ForeignKey("insurance_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    insurance_plan = relationship("InsurancePlanModel", back_populates="networks")


# ---------------------------------------------------------------------------
# contact (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class InsurancePlanContact(Base):
    __tablename__ = "insurance_plan_contact"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_plan_id = Column(Integer, ForeignKey("insurance_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # purpose (0..1 CodeableConcept)
    purpose_system = Column(String, nullable=True)
    purpose_code = Column(String, nullable=True)
    purpose_display = Column(String, nullable=True)
    purpose_text = Column(String, nullable=True)

    # name (0..1 HumanName — flattened)
    name_use = Column(String, nullable=True)
    name_text = Column(String, nullable=True)
    name_family = Column(String, nullable=True)
    name_given = Column(String, nullable=True)
    name_prefix = Column(String, nullable=True)
    name_suffix = Column(String, nullable=True)

    # address (0..1 Address — flattened)
    address_use = Column(String, nullable=True)
    address_type = Column(String, nullable=True)
    address_text = Column(String, nullable=True)
    address_line = Column(String, nullable=True)
    address_city = Column(String, nullable=True)
    address_district = Column(String, nullable=True)
    address_state = Column(String, nullable=True)
    address_postal_code = Column(String, nullable=True)
    address_country = Column(String, nullable=True)

    insurance_plan = relationship("InsurancePlanModel", back_populates="contacts")
    telecoms = relationship("InsurancePlanContactTelecom", back_populates="contact", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# contact.telecom (0..*) — ContactPoint grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanContactTelecom(Base):
    __tablename__ = "insurance_plan_contact_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(Integer, ForeignKey("insurance_plan_contact.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(String, nullable=True)
    value = Column(String, nullable=True)
    use = Column(String, nullable=True)
    rank = Column(Integer, nullable=True)

    contact = relationship("InsurancePlanContact", back_populates="telecoms")


# ---------------------------------------------------------------------------
# coverage (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class InsurancePlanCoverage(Base):
    __tablename__ = "insurance_plan_coverage"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_plan_id = Column(Integer, ForeignKey("insurance_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    insurance_plan = relationship("InsurancePlanModel", back_populates="coverages")
    networks = relationship("InsurancePlanCoverageNetwork", back_populates="coverage", cascade="all, delete-orphan")
    benefits = relationship("InsurancePlanCoverageBenefit", back_populates="coverage", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# coverage.network (0..*) — Reference(Organization) grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanCoverageNetwork(Base):
    __tablename__ = "insurance_plan_coverage_network"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coverage_id = Column(Integer, ForeignKey("insurance_plan_coverage.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    coverage = relationship("InsurancePlanCoverage", back_populates="networks")


# ---------------------------------------------------------------------------
# coverage.benefit (1..*) — BackboneElement grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanCoverageBenefit(Base):
    __tablename__ = "insurance_plan_coverage_benefit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    coverage_id = Column(Integer, ForeignKey("insurance_plan_coverage.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    requirement = Column(String, nullable=True)

    coverage = relationship("InsurancePlanCoverage", back_populates="benefits")
    limits = relationship("InsurancePlanCoverageBenefitLimit", back_populates="benefit", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# coverage.benefit.limit (0..*) — great-grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanCoverageBenefitLimit(Base):
    __tablename__ = "insurance_plan_coverage_benefit_limit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    benefit_id = Column(Integer, ForeignKey("insurance_plan_coverage_benefit.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # value (0..1 Quantity)
    value_value = Column(Numeric, nullable=True)
    value_comparator = Column(String, nullable=True)
    value_unit = Column(String, nullable=True)
    value_system = Column(String, nullable=True)
    value_code = Column(String, nullable=True)

    # code (0..1 CodeableConcept)
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    benefit = relationship("InsurancePlanCoverageBenefit", back_populates="limits")


# ---------------------------------------------------------------------------
# plan (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class InsurancePlanPlan(Base):
    __tablename__ = "insurance_plan_plan"

    id = Column(Integer, primary_key=True, autoincrement=True)
    insurance_plan_id = Column(Integer, ForeignKey("insurance_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (0..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    insurance_plan = relationship("InsurancePlanModel", back_populates="plans")
    plan_identifiers = relationship("InsurancePlanPlanIdentifier", back_populates="plan", cascade="all, delete-orphan")
    plan_coverage_areas = relationship("InsurancePlanPlanCoverageArea", back_populates="plan", cascade="all, delete-orphan")
    plan_networks = relationship("InsurancePlanPlanNetwork", back_populates="plan", cascade="all, delete-orphan")
    general_costs = relationship("InsurancePlanPlanGeneralCost", back_populates="plan", cascade="all, delete-orphan")
    specific_costs = relationship("InsurancePlanPlanSpecificCost", back_populates="plan", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# plan.identifier (0..*) — Identifier grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanPlanIdentifier(Base):
    __tablename__ = "insurance_plan_plan_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("insurance_plan_plan.id"), nullable=False, index=True)
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

    plan = relationship("InsurancePlanPlan", back_populates="plan_identifiers")


# ---------------------------------------------------------------------------
# plan.coverageArea (0..*) — Reference(Location) grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanPlanCoverageArea(Base):
    __tablename__ = "insurance_plan_plan_coverage_area"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("insurance_plan_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    plan = relationship("InsurancePlanPlan", back_populates="plan_coverage_areas")


# ---------------------------------------------------------------------------
# plan.network (0..*) — Reference(Organization) grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanPlanNetwork(Base):
    __tablename__ = "insurance_plan_plan_network"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("insurance_plan_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    plan = relationship("InsurancePlanPlan", back_populates="plan_networks")


# ---------------------------------------------------------------------------
# plan.generalCost (0..*) — BackboneElement grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanPlanGeneralCost(Base):
    __tablename__ = "insurance_plan_plan_general_cost"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("insurance_plan_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (0..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    group_size = Column(Integer, nullable=True)

    # cost (0..1 Money)
    cost_value = Column(Numeric, nullable=True)
    cost_currency = Column(String, nullable=True)

    comment = Column(String, nullable=True)

    plan = relationship("InsurancePlanPlan", back_populates="general_costs")


# ---------------------------------------------------------------------------
# plan.specificCost (0..*) — BackboneElement grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanPlanSpecificCost(Base):
    __tablename__ = "insurance_plan_plan_specific_cost"

    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(Integer, ForeignKey("insurance_plan_plan.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # category (1..1 CodeableConcept)
    category_system = Column(String, nullable=True)
    category_code = Column(String, nullable=True)
    category_display = Column(String, nullable=True)
    category_text = Column(String, nullable=True)

    plan = relationship("InsurancePlanPlan", back_populates="specific_costs")
    sc_benefits = relationship("InsurancePlanPlanSCBenefit", back_populates="specific_cost", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# plan.specificCost.benefit (0..*) — great-grandchild table
# ---------------------------------------------------------------------------


class InsurancePlanPlanSCBenefit(Base):
    __tablename__ = "insurance_plan_plan_sc_benefit"

    id = Column(Integer, primary_key=True, autoincrement=True)
    specific_cost_id = Column(Integer, ForeignKey("insurance_plan_plan_specific_cost.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    specific_cost = relationship("InsurancePlanPlanSpecificCost", back_populates="sc_benefits")
    costs = relationship("InsurancePlanPlanSCBenefitCost", back_populates="sc_benefit", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# plan.specificCost.benefit.cost (0..*) — level-5 table
# qualifiers stored as JSON text to avoid a 6th level of nesting
# ---------------------------------------------------------------------------


class InsurancePlanPlanSCBenefitCost(Base):
    __tablename__ = "insurance_plan_plan_sc_benefit_cost"

    id = Column(Integer, primary_key=True, autoincrement=True)
    sc_benefit_id = Column(Integer, ForeignKey("insurance_plan_plan_sc_benefit.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # applicability (0..1 CodeableConcept)
    applicability_system = Column(String, nullable=True)
    applicability_code = Column(String, nullable=True)
    applicability_display = Column(String, nullable=True)
    applicability_text = Column(String, nullable=True)

    # qualifiers (0..* CodeableConcept) — stored as JSON array string
    qualifiers_json = Column(Text, nullable=True)

    # value (0..1 Quantity)
    value_value = Column(Numeric, nullable=True)
    value_comparator = Column(String, nullable=True)
    value_unit = Column(String, nullable=True)
    value_system = Column(String, nullable=True)
    value_code = Column(String, nullable=True)

    sc_benefit = relationship("InsurancePlanPlanSCBenefit", back_populates="costs")
