from sqlalchemy import (
    Boolean,
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
from app.models.audit_event.enums import (
    AuditEventLocationReferenceType,
    AuditEventWhoReferenceType,
)

audit_event_id_seq = Sequence("audit_event_pub_seq", start=340000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class AuditEventModel(Base):
    __tablename__ = "audit_event"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    audit_event_id = Column(
        Integer,
        audit_event_id_seq,
        server_default=audit_event_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # type (1..1 Coding)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=False)
    type_display = Column(String, nullable=True)

    # action (0..1 code)
    action = Column(String, nullable=True)

    # period (0..1 Period)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # recorded (1..1 instant)
    recorded = Column(DateTime(timezone=True), nullable=False)

    # outcome (0..1 code)
    outcome = Column(String, nullable=True)

    # outcomeDesc (0..1 string)
    outcome_desc = Column(String, nullable=True)

    # source (1..1 BackboneElement — flattened)
    source_site = Column(String, nullable=True)
    source_observer_type = Column(
        Enum(AuditEventWhoReferenceType, name="audit_event_who_reference_type"),
        nullable=True,
    )
    source_observer_id = Column(Integer, nullable=True)
    source_observer_display = Column(String, nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Relationships
    subtypes = relationship("AuditEventSubtype", back_populates="audit_event", cascade="all, delete-orphan")
    purpose_of_events = relationship("AuditEventPurposeOfEvent", back_populates="audit_event", cascade="all, delete-orphan")
    source_types = relationship("AuditEventSourceType", back_populates="audit_event", cascade="all, delete-orphan")
    agents = relationship("AuditEventAgent", back_populates="audit_event", cascade="all, delete-orphan")
    entities = relationship("AuditEventEntity", back_populates="audit_event", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# subtype (0..* Coding)
# ---------------------------------------------------------------------------


class AuditEventSubtype(Base):
    __tablename__ = "audit_event_subtype"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_event_id = Column(Integer, ForeignKey("audit_event.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(String, nullable=True)
    code = Column(String, nullable=True)
    display = Column(String, nullable=True)

    audit_event = relationship("AuditEventModel", back_populates="subtypes")


# ---------------------------------------------------------------------------
# purposeOfEvent (0..* CodeableConcept)
# ---------------------------------------------------------------------------


class AuditEventPurposeOfEvent(Base):
    __tablename__ = "audit_event_purpose_of_event"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_event_id = Column(Integer, ForeignKey("audit_event.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    audit_event = relationship("AuditEventModel", back_populates="purpose_of_events")


# ---------------------------------------------------------------------------
# source.type (0..* Coding)
# ---------------------------------------------------------------------------


class AuditEventSourceType(Base):
    __tablename__ = "audit_event_source_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_event_id = Column(Integer, ForeignKey("audit_event.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(String, nullable=True)
    code = Column(String, nullable=True)
    display = Column(String, nullable=True)

    audit_event = relationship("AuditEventModel", back_populates="source_types")


# ---------------------------------------------------------------------------
# agent (1..* BackboneElement)
# ---------------------------------------------------------------------------


class AuditEventAgent(Base):
    __tablename__ = "audit_event_agent"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_event_id = Column(Integer, ForeignKey("audit_event.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (0..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # who (0..1 Reference)
    who_type = Column(
        Enum(AuditEventWhoReferenceType, name="audit_event_who_reference_type", create_type=False),
        nullable=True,
    )
    who_id = Column(Integer, nullable=True)
    who_display = Column(String, nullable=True)

    # altId (0..1 string)
    alt_id = Column(String, nullable=True)

    # name (0..1 string)
    name = Column(String, nullable=True)

    # requestor (1..1 boolean)
    requestor = Column(Boolean, nullable=False, default=False)

    # location (0..1 Reference(Location))
    location_type = Column(
        Enum(AuditEventLocationReferenceType, name="audit_event_location_reference_type"),
        nullable=True,
    )
    location_id = Column(Integer, nullable=True)
    location_display = Column(String, nullable=True)

    # media (0..1 Coding)
    media_system = Column(String, nullable=True)
    media_code = Column(String, nullable=True)
    media_display = Column(String, nullable=True)

    # network (0..1 BackboneElement — flattened)
    network_address = Column(String, nullable=True)
    network_type = Column(String, nullable=True)

    audit_event = relationship("AuditEventModel", back_populates="agents")
    roles = relationship("AuditEventAgentRole", back_populates="agent", cascade="all, delete-orphan")
    policies = relationship("AuditEventAgentPolicy", back_populates="agent", cascade="all, delete-orphan")
    purpose_of_uses = relationship("AuditEventAgentPurposeOfUse", back_populates="agent", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# agent.role (0..* CodeableConcept) — grandchild
# ---------------------------------------------------------------------------


class AuditEventAgentRole(Base):
    __tablename__ = "audit_event_agent_role"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(Integer, ForeignKey("audit_event_agent.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    agent = relationship("AuditEventAgent", back_populates="roles")


# ---------------------------------------------------------------------------
# agent.policy (0..* uri) — grandchild
# ---------------------------------------------------------------------------


class AuditEventAgentPolicy(Base):
    __tablename__ = "audit_event_agent_policy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(Integer, ForeignKey("audit_event_agent.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    value = Column(String, nullable=True)

    agent = relationship("AuditEventAgent", back_populates="policies")


# ---------------------------------------------------------------------------
# agent.purposeOfUse (0..* CodeableConcept) — grandchild
# ---------------------------------------------------------------------------


class AuditEventAgentPurposeOfUse(Base):
    __tablename__ = "audit_event_agent_purpose_of_use"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_id = Column(Integer, ForeignKey("audit_event_agent.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    agent = relationship("AuditEventAgent", back_populates="purpose_of_uses")


# ---------------------------------------------------------------------------
# entity (0..* BackboneElement)
# ---------------------------------------------------------------------------


class AuditEventEntity(Base):
    __tablename__ = "audit_event_entity"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_event_id = Column(Integer, ForeignKey("audit_event.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # what (0..1 Reference — open)
    what_type = Column(String, nullable=True)
    what_id = Column(Integer, nullable=True)
    what_display = Column(String, nullable=True)

    # type (0..1 Coding)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)

    # role (0..1 Coding)
    role_system = Column(String, nullable=True)
    role_code = Column(String, nullable=True)
    role_display = Column(String, nullable=True)

    # lifecycle (0..1 Coding)
    lifecycle_system = Column(String, nullable=True)
    lifecycle_code = Column(String, nullable=True)
    lifecycle_display = Column(String, nullable=True)

    # name (0..1 string)
    name = Column(String, nullable=True)

    # description (0..1 string)
    description = Column(String, nullable=True)

    # query (0..1 base64Binary)
    query = Column(Text, nullable=True)

    audit_event = relationship("AuditEventModel", back_populates="entities")
    security_labels = relationship("AuditEventEntitySecurityLabel", back_populates="entity", cascade="all, delete-orphan")
    details = relationship("AuditEventEntityDetail", back_populates="entity", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# entity.securityLabel (0..* Coding) — grandchild
# ---------------------------------------------------------------------------


class AuditEventEntitySecurityLabel(Base):
    __tablename__ = "audit_event_entity_security_label"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_id = Column(Integer, ForeignKey("audit_event_entity.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(String, nullable=True)
    code = Column(String, nullable=True)
    display = Column(String, nullable=True)

    entity = relationship("AuditEventEntity", back_populates="security_labels")


# ---------------------------------------------------------------------------
# entity.detail (0..* BackboneElement) — grandchild
# ---------------------------------------------------------------------------


class AuditEventEntityDetail(Base):
    __tablename__ = "audit_event_entity_detail"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_id = Column(Integer, ForeignKey("audit_event_entity.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # type (1..1 string)
    type = Column(String, nullable=False)

    # value[x] (1..1 string | base64Binary)
    value_string = Column(Text, nullable=True)
    value_base64_binary = Column(Text, nullable=True)

    entity = relationship("AuditEventEntity", back_populates="details")
