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
from app.models.enums import OrganizationReferenceType
from app.models.location.enums import (
    LocationEndpointReferenceType,
    LocationMode,
    LocationPartOfReferenceType,
    LocationStatus,
)
from app.schemas.enums import ContactPointSystem, ContactPointUse

location_id_seq = Sequence("location_pub_seq", start=230000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class LocationModel(Base):
    __tablename__ = "location"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    location_id = Column(
        Integer,
        location_id_seq,
        server_default=location_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── status (0..1 code) ────────────────────────────────────────────────────

    status = Column(Enum(LocationStatus, name="location_status"), nullable=True)

    # ── operationalStatus (0..1 Coding) ──────────────────────────────────────

    operational_status_system = Column(String, nullable=True)
    operational_status_code = Column(String, nullable=True)
    operational_status_display = Column(String, nullable=True)

    # ── name (0..1 string) ────────────────────────────────────────────────────

    name = Column(String, nullable=True, index=True)

    # ── description (0..1 string) ─────────────────────────────────────────────

    description = Column(Text, nullable=True)

    # ── mode (0..1 code) ─────────────────────────────────────────────────────

    mode = Column(Enum(LocationMode, name="location_mode"), nullable=True)

    # ── address (0..1 Address) — flattened ───────────────────────────────────

    address_use = Column(String, nullable=True)
    address_type = Column(String, nullable=True)
    address_text = Column(Text, nullable=True)
    address_line = Column(Text, nullable=True)       # comma-separated per Address.line[] exception
    address_city = Column(String, nullable=True)
    address_district = Column(String, nullable=True)
    address_state = Column(String, nullable=True)
    address_postal_code = Column(String, nullable=True)
    address_country = Column(String, nullable=True)
    address_period_start = Column(DateTime(timezone=True), nullable=True)
    address_period_end = Column(DateTime(timezone=True), nullable=True)

    # ── physicalType (0..1 CodeableConcept) ──────────────────────────────────

    physical_type_system = Column(String, nullable=True)
    physical_type_code = Column(String, nullable=True)
    physical_type_display = Column(String, nullable=True)
    physical_type_text = Column(String, nullable=True)

    # ── managingOrganization (0..1 Reference(Organization)) ──────────────────

    managing_organization_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    managing_organization_id = Column(Integer, nullable=True)
    managing_organization_display = Column(String, nullable=True)

    # ── partOf (0..1 Reference(Location)) ────────────────────────────────────

    part_of_type = Column(
        Enum(LocationPartOfReferenceType, name="location_part_of_reference_type"),
        nullable=True,
    )
    part_of_id = Column(Integer, nullable=True)
    part_of_display = Column(String, nullable=True)

    # ── availabilityExceptions (0..1 string) ─────────────────────────────────

    availability_exceptions = Column(Text, nullable=True)

    # ── position (0..1 BackboneElement) — flattened ──────────────────────────

    position_longitude = Column(Numeric(18, 8), nullable=True)
    position_latitude = Column(Numeric(18, 8), nullable=True)
    position_altitude = Column(Numeric(18, 8), nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    identifiers = relationship(
        "LocationIdentifier",
        back_populates="location",
        cascade="all, delete-orphan",
    )
    aliases = relationship(
        "LocationAlias",
        back_populates="location",
        cascade="all, delete-orphan",
    )
    types = relationship(
        "LocationType",
        back_populates="location",
        cascade="all, delete-orphan",
    )
    telecoms = relationship(
        "LocationTelecom",
        back_populates="location",
        cascade="all, delete-orphan",
    )
    hours_of_operation = relationship(
        "LocationHoursOfOperation",
        back_populates="location",
        cascade="all, delete-orphan",
    )
    endpoints = relationship(
        "LocationEndpoint",
        back_populates="location",
        cascade="all, delete-orphan",
    )


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class LocationIdentifier(Base):
    """identifier[] — unique codes/numbers identifying the location."""

    __tablename__ = "location_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("location.id"), nullable=False, index=True)
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

    location = relationship("LocationModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# alias (0..*) — simple string list
# ---------------------------------------------------------------------------


class LocationAlias(Base):
    """alias[] — alternate names the location is or was known as."""

    __tablename__ = "location_alias"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("location.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    alias = Column(String, nullable=False)

    location = relationship("LocationModel", back_populates="aliases")


# ---------------------------------------------------------------------------
# type (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class LocationType(Base):
    """type[] — function performed at the location (CodeableConcept)."""

    __tablename__ = "location_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("location.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    location = relationship("LocationModel", back_populates="types")


# ---------------------------------------------------------------------------
# telecom (0..*) — ContactPoint child table
# ---------------------------------------------------------------------------


class LocationTelecom(Base):
    """telecom[] — ContactPoint contact details for the location."""

    __tablename__ = "location_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("location.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(Enum(ContactPointSystem, name="contact_point_system", create_type=False), nullable=True)
    value = Column(String, nullable=True)
    use = Column(Enum(ContactPointUse, name="contact_point_use", create_type=False), nullable=True)
    rank = Column(Integer, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    location = relationship("LocationModel", back_populates="telecoms")


# ---------------------------------------------------------------------------
# hoursOfOperation (0..*) BackboneElement child table
# ---------------------------------------------------------------------------


class LocationHoursOfOperation(Base):
    """hoursOfOperation[] — usual days/times this location is open.

    BackboneElement fields:
      - daysOfWeek    (0..* code)    comma-separated days: mon,tue,wed,thu,fri,sat,sun
      - allDay        (0..1 boolean) true if open 24/7
      - openingTime   (0..1 time)    HH:mm:ss opening time
      - closingTime   (0..1 time)    HH:mm:ss closing time
    """

    __tablename__ = "location_hours_of_operation"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("location.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    days_of_week = Column(Text, nullable=True)      # comma-separated: mon,tue,…
    all_day = Column(Boolean, nullable=True)
    opening_time = Column(String, nullable=True)    # HH:mm:ss
    closing_time = Column(String, nullable=True)    # HH:mm:ss

    location = relationship("LocationModel", back_populates="hours_of_operation")


# ---------------------------------------------------------------------------
# endpoint (0..*) — Reference(Endpoint) child table
# ---------------------------------------------------------------------------


class LocationEndpoint(Base):
    """endpoint[] — Reference(Endpoint) technical access points for this location."""

    __tablename__ = "location_endpoint"

    id = Column(Integer, primary_key=True, autoincrement=True)
    location_id = Column(Integer, ForeignKey("location.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(LocationEndpointReferenceType, name="location_endpoint_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    location = relationship("LocationModel", back_populates="endpoints")
