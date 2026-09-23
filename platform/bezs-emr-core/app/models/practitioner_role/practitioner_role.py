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
from app.models.practitioner_role.enums import (
    PractitionerRoleEndpointReferenceType,
    PractitionerRoleHealthcareServiceReferenceType,
    PractitionerRoleLocationReferenceType,
)
from app.schemas.enums import (
    AddressType,
    AddressUse,
    ContactPointSystem,
    ContactPointUse,
    HumanNameUse,
    IdentifierUse,
)

practitioner_role_id_seq = Sequence("practitioner_role_pub_seq", start=140000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------

class PractitionerRoleModel(Base):
    __tablename__ = "practitioner_role"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    practitioner_role_id = Column(
        Integer,
        practitioner_role_id_seq,
        server_default=practitioner_role_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    active = Column(Boolean, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # practitioner (0..1 Reference(Practitioner))
    practitioner_fk_id = Column(Integer, ForeignKey("practitioner.id"), nullable=True, index=True)
    practitioner_ref_id = Column(Integer, nullable=True)   # public practitioner_id for FHIR ref
    practitioner_display = Column(String, nullable=True)

    # organization (0..1 Reference(Organization))
    organization_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    organization_id = Column(Integer, nullable=True)
    organization_display = Column(String, nullable=True)

    # availabilityExceptions (0..1 string) — narrative exceptions to availability
    availability_exceptions = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # parent relationship
    practitioner = relationship("PractitionerModel")

    # child relationships
    identifiers = relationship(
        "PractitionerRoleIdentifier", back_populates="practitioner_role", cascade="all, delete-orphan"
    )
    codes = relationship(
        "PractitionerRoleCode", back_populates="practitioner_role", cascade="all, delete-orphan"
    )
    specialties = relationship(
        "PractitionerRoleSpecialty", back_populates="practitioner_role", cascade="all, delete-orphan"
    )
    locations = relationship(
        "PractitionerRoleLocation", back_populates="practitioner_role", cascade="all, delete-orphan"
    )
    healthcare_services = relationship(
        "PractitionerRoleHealthcareService", back_populates="practitioner_role", cascade="all, delete-orphan"
    )
    characteristics = relationship(
        "PractitionerRoleCharacteristic", back_populates="practitioner_role", cascade="all, delete-orphan"
    )
    communications = relationship(
        "PractitionerRoleCommunication", back_populates="practitioner_role", cascade="all, delete-orphan"
    )
    contacts = relationship(
        "PractitionerRoleContact", back_populates="practitioner_role", cascade="all, delete-orphan"
    )
    availabilities = relationship(
        "PractitionerRoleAvailability", back_populates="practitioner_role", cascade="all, delete-orphan"
    )
    endpoints = relationship(
        "PractitionerRoleEndpoint", back_populates="practitioner_role", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier[] — 0..*  (Identifier)
# ---------------------------------------------------------------------------

class PractitionerRoleIdentifier(Base):
    __tablename__ = "practitioner_role_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(IdentifierUse, name="identifier_use"), nullable=True)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)
    system = Column(String, nullable=True)
    value = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    assigner = Column(String, nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# code[] — 0..*  (CodeableConcept)
# ---------------------------------------------------------------------------

class PractitionerRoleCode(Base):
    __tablename__ = "practitioner_role_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="codes")


# ---------------------------------------------------------------------------
# specialty[] — 0..*  (CodeableConcept)
# ---------------------------------------------------------------------------

class PractitionerRoleSpecialty(Base):
    __tablename__ = "practitioner_role_specialty"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="specialties")


# ---------------------------------------------------------------------------
# location[] — 0..*  (Reference(Location))
# ---------------------------------------------------------------------------

class PractitionerRoleLocation(Base):
    __tablename__ = "practitioner_role_location"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(PractitionerRoleLocationReferenceType, name="pr_location_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="locations")


# ---------------------------------------------------------------------------
# healthcareService[] — 0..*  (Reference(HealthcareService))
# ---------------------------------------------------------------------------

class PractitionerRoleHealthcareService(Base):
    __tablename__ = "practitioner_role_healthcare_service"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(PractitionerRoleHealthcareServiceReferenceType, name="pr_healthcare_service_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="healthcare_services")


# ---------------------------------------------------------------------------
# characteristic[] — 0..*  (CodeableConcept)  [R5 extension, intentional]
# ---------------------------------------------------------------------------

class PractitionerRoleCharacteristic(Base):
    __tablename__ = "practitioner_role_characteristic"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="characteristics")


# ---------------------------------------------------------------------------
# communication[] — 0..*  (CodeableConcept)  [R5 extension, intentional]
# ---------------------------------------------------------------------------

class PractitionerRoleCommunication(Base):
    __tablename__ = "practitioner_role_communication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="communications")


# ---------------------------------------------------------------------------
# contact[] — 0..*  (ExtendedContactDetail)  [R5 extension, intentional]
#
# Structure:
#   practitioner_role
#     └── practitioner_role_contact          (one row per contact entry)
#           ├── practitioner_role_contact_name[]     (HumanName)
#           └── practitioner_role_contact_telecom[]  (ContactPoint)
# ---------------------------------------------------------------------------

class PractitionerRoleContact(Base):
    __tablename__ = "practitioner_role_contact"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # purpose (0..1 CodeableConcept — flattened)
    purpose_system = Column(String, nullable=True)
    purpose_code = Column(String, nullable=True)
    purpose_display = Column(String, nullable=True)
    purpose_text = Column(String, nullable=True)

    # address (0..1 Address — flattened)
    address_use = Column(Enum(AddressUse, name="address_use"), nullable=True)
    address_type = Column(Enum(AddressType, name="address_type"), nullable=True)
    address_text = Column(String, nullable=True)
    address_line = Column(Text, nullable=True)        # comma-separated street lines
    address_city = Column(String, nullable=True)
    address_district = Column(String, nullable=True)
    address_state = Column(String, nullable=True)
    address_postal_code = Column(String, nullable=True)
    address_country = Column(String, nullable=True)
    address_period_start = Column(DateTime(timezone=True), nullable=True)
    address_period_end = Column(DateTime(timezone=True), nullable=True)

    # organization (0..1 Reference(Organization) — flattened)
    organization_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    organization_id = Column(Integer, nullable=True)
    organization_display = Column(String, nullable=True)

    # period (0..1 — flattened)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="contacts")
    names = relationship(
        "PractitionerRoleContactName", back_populates="contact", cascade="all, delete-orphan"
    )
    telecoms = relationship(
        "PractitionerRoleContactTelecom", back_populates="contact", cascade="all, delete-orphan"
    )


class PractitionerRoleContactName(Base):
    """HumanName entries for a single ExtendedContactDetail (contact.name — 0..*)."""
    __tablename__ = "practitioner_role_contact_name"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(Integer, ForeignKey("practitioner_role_contact.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(HumanNameUse, name="human_name_use"), nullable=True)
    text = Column(String, nullable=True)
    family = Column(String, nullable=True)
    given = Column(Text, nullable=True)        # comma-separated
    prefix = Column(Text, nullable=True)       # comma-separated
    suffix = Column(Text, nullable=True)       # comma-separated
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    contact = relationship("PractitionerRoleContact", back_populates="names")


class PractitionerRoleContactTelecom(Base):
    """ContactPoint entries for a single ExtendedContactDetail (contact.telecom — 0..*)."""
    __tablename__ = "practitioner_role_contact_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(Integer, ForeignKey("practitioner_role_contact.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(Enum(ContactPointSystem, name="contact_point_system"), nullable=True)
    value = Column(String, nullable=True)
    use = Column(Enum(ContactPointUse, name="contact_point_use"), nullable=True)
    rank = Column(Integer, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    contact = relationship("PractitionerRoleContact", back_populates="telecoms")


# ---------------------------------------------------------------------------
# availability[] — 0..*  (Availability)  [R5 extension, intentional]
#
# Structure:
#   practitioner_role
#     └── practitioner_role_availability          (one row per Availability grouping)
#           ├── practitioner_role_availability_time[]      (availableTime)
#           └── practitioner_role_not_available_time[]     (notAvailableTime)
# ---------------------------------------------------------------------------

class PractitionerRoleAvailability(Base):
    __tablename__ = "practitioner_role_availability"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="availabilities")
    available_times = relationship(
        "PractitionerRoleAvailabilityTime", back_populates="availability", cascade="all, delete-orphan"
    )
    not_available_times = relationship(
        "PractitionerRoleNotAvailableTime", back_populates="availability", cascade="all, delete-orphan"
    )


class PractitionerRoleAvailabilityTime(Base):
    """availableTime BackboneElement — times the role is available."""
    __tablename__ = "practitioner_role_availability_time"

    id = Column(Integer, primary_key=True, autoincrement=True)
    availability_id = Column(Integer, ForeignKey("practitioner_role_availability.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # daysOfWeek is 0..* code — stored comma-separated (mon,tue,wed…); never individually filtered
    days_of_week = Column(Text, nullable=True)
    all_day = Column(Boolean, nullable=True)
    # FHIR time type is HH:mm:ss — stored as String
    available_start_time = Column(String, nullable=True)
    available_end_time = Column(String, nullable=True)

    availability = relationship("PractitionerRoleAvailability", back_populates="available_times")


class PractitionerRoleNotAvailableTime(Base):
    """notAvailableTime BackboneElement — times the role is not available."""
    __tablename__ = "practitioner_role_not_available_time"

    id = Column(Integer, primary_key=True, autoincrement=True)
    availability_id = Column(Integer, ForeignKey("practitioner_role_availability.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    description = Column(String, nullable=True)
    during_start = Column(DateTime(timezone=True), nullable=True)
    during_end = Column(DateTime(timezone=True), nullable=True)

    availability = relationship("PractitionerRoleAvailability", back_populates="not_available_times")


# ---------------------------------------------------------------------------
# endpoint[] — 0..*  (Reference(Endpoint))
# ---------------------------------------------------------------------------

class PractitionerRoleEndpoint(Base):
    __tablename__ = "practitioner_role_endpoint"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_role_id = Column(Integer, ForeignKey("practitioner_role.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(PractitionerRoleEndpointReferenceType, name="pr_endpoint_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    practitioner_role = relationship("PractitionerRoleModel", back_populates="endpoints")
