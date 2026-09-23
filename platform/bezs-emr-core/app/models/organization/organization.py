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
from app.models.enums import OrganizationReferenceType
from app.models.organization.enums import OrganizationEndpointReferenceType

organization_id_seq = Sequence("organization_pub_seq", start=190000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------

class OrganizationModel(Base):
    __tablename__ = "organization"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    organization_id = Column(
        Integer,
        organization_id_seq,
        server_default=organization_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # active (0..1)
    active = Column(Boolean, nullable=True)

    # name (0..1)
    name = Column(String, nullable=True)

    # partOf (0..1) Reference(Organization) — shared PG type
    partof_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    partof_id = Column(Integer, nullable=True)
    partof_display = Column(String, nullable=True)

    # Relationships
    identifiers = relationship(
        "OrganizationIdentifier", back_populates="organization", cascade="all, delete-orphan"
    )
    types = relationship(
        "OrganizationType", back_populates="organization", cascade="all, delete-orphan"
    )
    aliases = relationship(
        "OrganizationAlias", back_populates="organization", cascade="all, delete-orphan"
    )
    telecoms = relationship(
        "OrganizationTelecom", back_populates="organization", cascade="all, delete-orphan"
    )
    addresses = relationship(
        "OrganizationAddress", back_populates="organization", cascade="all, delete-orphan"
    )
    contacts = relationship(
        "OrganizationContact", back_populates="organization", cascade="all, delete-orphan"
    )
    endpoints = relationship(
        "OrganizationEndpoint", back_populates="organization", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier (0..*) child table
# ---------------------------------------------------------------------------

class OrganizationIdentifier(Base):
    __tablename__ = "organization_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organization.id"), nullable=False, index=True)
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

    organization = relationship("OrganizationModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# type (0..*) CodeableConcept child table
# ---------------------------------------------------------------------------

class OrganizationType(Base):
    __tablename__ = "organization_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    organization = relationship("OrganizationModel", back_populates="types")


# ---------------------------------------------------------------------------
# alias (0..*) child table — one row per alternative name
# ---------------------------------------------------------------------------

class OrganizationAlias(Base):
    __tablename__ = "organization_alias"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    value = Column(String, nullable=False)

    organization = relationship("OrganizationModel", back_populates="aliases")


# ---------------------------------------------------------------------------
# telecom (0..*) ContactPoint child table
# ---------------------------------------------------------------------------

class OrganizationTelecom(Base):
    __tablename__ = "organization_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    system = Column(String, nullable=True)   # phone | fax | email | pager | url | sms | other
    value = Column(String, nullable=True)
    use = Column(String, nullable=True)      # home | work | temp | old | mobile
    rank = Column(Integer, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("OrganizationModel", back_populates="telecoms")


# ---------------------------------------------------------------------------
# address (0..*) Address child table
# ---------------------------------------------------------------------------

class OrganizationAddress(Base):
    __tablename__ = "organization_address"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    use = Column(String, nullable=True)          # home | work | temp | old | billing
    type = Column(String, nullable=True)         # postal | physical | both
    text = Column(String, nullable=True)
    line = Column(Text, nullable=True)           # comma-separated (Address.line[] exception)
    city = Column(String, nullable=True)
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("OrganizationModel", back_populates="addresses")


# ---------------------------------------------------------------------------
# contact (0..*) BackboneElement child table
# ---------------------------------------------------------------------------

class OrganizationContact(Base):
    __tablename__ = "organization_contact"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # purpose (0..1) CodeableConcept
    purpose_system = Column(String, nullable=True)
    purpose_code = Column(String, nullable=True)
    purpose_display = Column(String, nullable=True)
    purpose_text = Column(String, nullable=True)

    # name (0..1) HumanName — flattened; given/prefix/suffix stored comma-separated
    name_use = Column(String, nullable=True)
    name_text = Column(String, nullable=True)
    name_family = Column(String, nullable=True)
    name_given = Column(Text, nullable=True)     # comma-separated
    name_prefix = Column(Text, nullable=True)    # comma-separated
    name_suffix = Column(Text, nullable=True)    # comma-separated
    name_period_start = Column(DateTime(timezone=True), nullable=True)
    name_period_end = Column(DateTime(timezone=True), nullable=True)

    # address (0..1) Address — flattened
    address_use = Column(String, nullable=True)
    address_type = Column(String, nullable=True)
    address_text = Column(String, nullable=True)
    address_line = Column(Text, nullable=True)   # comma-separated
    address_city = Column(String, nullable=True)
    address_district = Column(String, nullable=True)
    address_state = Column(String, nullable=True)
    address_postal_code = Column(String, nullable=True)
    address_country = Column(String, nullable=True)
    address_period_start = Column(DateTime(timezone=True), nullable=True)
    address_period_end = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("OrganizationModel", back_populates="contacts")
    telecoms = relationship(
        "OrganizationContactTelecom", back_populates="contact", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# contact.telecom (0..*) ContactPoint grandchild table
# ---------------------------------------------------------------------------

class OrganizationContactTelecom(Base):
    __tablename__ = "organization_contact_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(Integer, ForeignKey("organization_contact.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    system = Column(String, nullable=True)
    value = Column(String, nullable=True)
    use = Column(String, nullable=True)
    rank = Column(Integer, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    contact = relationship("OrganizationContact", back_populates="telecoms")


# ---------------------------------------------------------------------------
# endpoint (0..*) Reference(Endpoint) child table
# ---------------------------------------------------------------------------

class OrganizationEndpoint(Base):
    __tablename__ = "organization_endpoint"

    id = Column(Integer, primary_key=True, autoincrement=True)
    organization_id = Column(Integer, ForeignKey("organization.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    reference_type = Column(
        Enum(OrganizationEndpointReferenceType, name="organization_endpoint_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    organization = relationship("OrganizationModel", back_populates="endpoints")
