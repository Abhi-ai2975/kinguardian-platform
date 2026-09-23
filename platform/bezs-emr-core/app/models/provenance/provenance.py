from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Sequence,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base
from app.models.provenance.enums import (
    ProvenanceAgentWhoReferenceType,
    ProvenanceEntityRole,
    ProvenanceLocationReferenceType,
)

provenance_id_seq = Sequence("provenance_pub_seq", start=270000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class ProvenanceModel(Base):
    __tablename__ = "provenance"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    provenance_id = Column(
        Integer,
        provenance_id_seq,
        server_default=provenance_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── occurred[x] (0..1 choice type) ────────────────────────────────────────

    # Period variant
    occurred_period_start = Column(DateTime(timezone=True), nullable=True)
    occurred_period_end = Column(DateTime(timezone=True), nullable=True)

    # dateTime variant
    occurred_date_time = Column(DateTime(timezone=True), nullable=True)

    # ── recorded (1..1 instant) ───────────────────────────────────────────────

    recorded = Column(DateTime(timezone=True), nullable=False)

    # ── location (0..1 Reference(Location)) ──────────────────────────────────

    location_type = Column(
        Enum(ProvenanceLocationReferenceType, name="provenance_location_reference_type"),
        nullable=True,
    )
    location_id = Column(Integer, nullable=True)
    location_display = Column(String, nullable=True)

    # ── activity (0..1 CodeableConcept) ──────────────────────────────────────

    activity_system = Column(String, nullable=True)
    activity_code = Column(String, nullable=True)
    activity_display = Column(String, nullable=True)
    activity_text = Column(String, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    targets = relationship(
        "ProvenanceTarget",
        back_populates="provenance",
        cascade="all, delete-orphan",
    )
    policies = relationship(
        "ProvenancePolicy",
        back_populates="provenance",
        cascade="all, delete-orphan",
    )
    reasons = relationship(
        "ProvenanceReason",
        back_populates="provenance",
        cascade="all, delete-orphan",
    )
    agents = relationship(
        "ProvenanceAgent",
        back_populates="provenance",
        cascade="all, delete-orphan",
    )
    entities = relationship(
        "ProvenanceEntity",
        back_populates="provenance",
        cascade="all, delete-orphan",
    )
    signatures = relationship(
        "ProvenanceSignature",
        back_populates="provenance",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# target (1..*) — Reference(Any) open
# ---------------------------------------------------------------------------


class ProvenanceTarget(Base):
    """target[] — any FHIR resource reference."""

    __tablename__ = "provenance_target"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provenance_id = Column(
        Integer, ForeignKey("provenance.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    provenance = relationship("ProvenanceModel", back_populates="targets")


# ---------------------------------------------------------------------------
# policy (0..*) — uri child table
# ---------------------------------------------------------------------------


class ProvenancePolicy(Base):
    """policy[] — URI governing policy reference."""

    __tablename__ = "provenance_policy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provenance_id = Column(
        Integer, ForeignKey("provenance.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    uri = Column(String, nullable=False)

    provenance = relationship("ProvenanceModel", back_populates="policies")


# ---------------------------------------------------------------------------
# reason (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class ProvenanceReason(Base):
    """reason[] — CodeableConcept justification for the activity."""

    __tablename__ = "provenance_reason"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provenance_id = Column(
        Integer, ForeignKey("provenance.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    provenance = relationship("ProvenanceModel", back_populates="reasons")


# ---------------------------------------------------------------------------
# agent (1..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class ProvenanceAgent(Base):
    """agent[] — actor assuming a role in the activity."""

    __tablename__ = "provenance_agent"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provenance_id = Column(
        Integer, ForeignKey("provenance.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # type (0..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # who (1..1 Reference — closed set)
    who_type = Column(
        Enum(ProvenanceAgentWhoReferenceType, name="provenance_agent_who_reference_type"),
        nullable=False,
    )
    who_id = Column(Integer, nullable=False)
    who_display = Column(String, nullable=True)

    # onBehalfOf (0..1 Reference — same closed set)
    on_behalf_of_type = Column(
        Enum(
            ProvenanceAgentWhoReferenceType,
            name="provenance_agent_who_reference_type",
            create_type=False,
        ),
        nullable=True,
    )
    on_behalf_of_id = Column(Integer, nullable=True)
    on_behalf_of_display = Column(String, nullable=True)

    provenance = relationship("ProvenanceModel", back_populates="agents")
    roles = relationship(
        "ProvenanceAgentRole",
        back_populates="agent",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# agent.role (0..*) — CodeableConcept grandchild table
# ---------------------------------------------------------------------------


class ProvenanceAgentRole(Base):
    """agent.role[] — security or functional role enabled by this agent."""

    __tablename__ = "provenance_agent_role"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(
        Integer, ForeignKey("provenance_agent.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    agent = relationship("ProvenanceAgent", back_populates="roles")


# ---------------------------------------------------------------------------
# entity (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class ProvenanceEntity(Base):
    """entity[] — input entity used in the activity."""

    __tablename__ = "provenance_entity"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provenance_id = Column(
        Integer, ForeignKey("provenance.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # role (1..1 code)
    role = Column(
        Enum(ProvenanceEntityRole, name="provenance_entity_role"),
        nullable=False,
    )

    # what (1..1 Reference(Any) — open)
    what_type = Column(String, nullable=False)
    what_id = Column(Integer, nullable=False)
    what_display = Column(String, nullable=True)

    provenance = relationship("ProvenanceModel", back_populates="entities")
    entity_agents = relationship(
        "ProvenanceEntityAgent",
        back_populates="entity",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# entity.agent (0..*) — grandchild BackboneElement table
# ---------------------------------------------------------------------------


class ProvenanceEntityAgent(Base):
    """entity.agent[] — agent responsible for this entity."""

    __tablename__ = "provenance_entity_agent"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_id = Column(
        Integer, ForeignKey("provenance_entity.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # type (0..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # who (1..1 Reference — same closed set, reuse PG type)
    who_type = Column(
        Enum(
            ProvenanceAgentWhoReferenceType,
            name="provenance_agent_who_reference_type",
            create_type=False,
        ),
        nullable=False,
    )
    who_id = Column(Integer, nullable=False)
    who_display = Column(String, nullable=True)

    # onBehalfOf (0..1 Reference)
    on_behalf_of_type = Column(
        Enum(
            ProvenanceAgentWhoReferenceType,
            name="provenance_agent_who_reference_type",
            create_type=False,
        ),
        nullable=True,
    )
    on_behalf_of_id = Column(Integer, nullable=True)
    on_behalf_of_display = Column(String, nullable=True)

    entity = relationship("ProvenanceEntity", back_populates="entity_agents")


# ---------------------------------------------------------------------------
# signature (0..*) — Signature child table
# ---------------------------------------------------------------------------


class ProvenanceSignature(Base):
    """signature[] — digital signature on the provenance targets."""

    __tablename__ = "provenance_signature"

    id = Column(Integer, primary_key=True, autoincrement=True)
    provenance_id = Column(
        Integer, ForeignKey("provenance.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # when (1..1 instant)
    when = Column(DateTime(timezone=True), nullable=False)

    # who (1..1 Reference — open)
    who_type = Column(String, nullable=True)
    who_id = Column(Integer, nullable=True)
    who_display = Column(String, nullable=True)

    # onBehalfOf (0..1 Reference — open)
    on_behalf_of_type = Column(String, nullable=True)
    on_behalf_of_id = Column(Integer, nullable=True)
    on_behalf_of_display = Column(String, nullable=True)

    target_format = Column(String, nullable=True)
    sig_format = Column(String, nullable=True)
    data = Column(Text, nullable=True)

    provenance = relationship("ProvenanceModel", back_populates="signatures")
    signature_types = relationship(
        "ProvenanceSignatureType",
        back_populates="signature",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# signature.type (1..*) — Coding grandchild table
# ---------------------------------------------------------------------------


class ProvenanceSignatureType(Base):
    """signature.type[] — reason for the signature (Coding)."""

    __tablename__ = "provenance_signature_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    signature_id = Column(
        Integer, ForeignKey("provenance_signature.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    system = Column(String, nullable=True)
    code = Column(String, nullable=True)
    display = Column(String, nullable=True)

    signature = relationship("ProvenanceSignature", back_populates="signature_types")
