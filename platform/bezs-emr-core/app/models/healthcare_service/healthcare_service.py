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
from app.models.healthcare_service.enums import (
    HealthcareServiceCoverageAreaReferenceType,
    HealthcareServiceEndpointReferenceType,
    HealthcareServiceLocationReferenceType,
)
from app.schemas.enums import (
    ContactPointSystem,
    ContactPointUse,
)

healthcare_service_id_seq = Sequence("healthcare_service_pub_seq", start=150000, increment=1, metadata=Base.metadata)


class HealthcareServiceModel(Base):
    __tablename__ = "healthcare_service"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    healthcare_service_id = Column(
        Integer,
        healthcare_service_id_seq,
        server_default=healthcare_service_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── active (0..1 boolean) ─────────────────────────────────────────────────

    active = Column(Boolean, nullable=True)

    # ── providedBy (0..1 Reference(Organization)) ─────────────────────────────

    provided_by_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    provided_by_id = Column(Integer, nullable=True)
    provided_by_display = Column(String, nullable=True)

    # ── name (0..1 string) ────────────────────────────────────────────────────

    name = Column(String, nullable=True, index=True)

    # ── comment (0..1 string) ─────────────────────────────────────────────────

    comment = Column(String, nullable=True)

    # ── extraDetails (0..1 markdown) ──────────────────────────────────────────

    extra_details = Column(Text, nullable=True)

    # ── photo (0..1 Attachment) — flattened ───────────────────────────────────
    # contentType | language | data | url | size | hash | title | creation

    photo_content_type = Column(String, nullable=True)   # MIME type e.g. "image/png"
    photo_language = Column(String, nullable=True)        # BCP-47 e.g. "en"
    photo_data = Column(Text, nullable=True)              # base64-encoded binary
    photo_url = Column(String, nullable=True)             # external URL
    photo_size = Column(Integer, nullable=True)           # byte size before base64
    photo_hash = Column(String, nullable=True)            # base64-encoded SHA-1
    photo_title = Column(String, nullable=True)           # human-readable label
    photo_creation = Column(DateTime(timezone=True), nullable=True)

    # ── appointmentRequired (0..1 boolean) ───────────────────────────────────

    appointment_required = Column(Boolean, nullable=True)

    # ── availabilityExceptions (0..1 string) ─────────────────────────────────

    availability_exceptions = Column(String, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    identifiers = relationship(
        "HealthcareServiceIdentifier",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    categories = relationship(
        "HealthcareServiceCategory",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    types = relationship(
        "HealthcareServiceType",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    specialties = relationship(
        "HealthcareServiceSpecialty",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    locations = relationship(
        "HealthcareServiceLocation",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    telecoms = relationship(
        "HealthcareServiceTelecom",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    coverage_areas = relationship(
        "HealthcareServiceCoverageArea",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    service_provision_codes = relationship(
        "HealthcareServiceServiceProvisionCode",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    eligibilities = relationship(
        "HealthcareServiceEligibility",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    programs = relationship(
        "HealthcareServiceProgram",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    characteristics = relationship(
        "HealthcareServiceCharacteristic",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    communications = relationship(
        "HealthcareServiceCommunication",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    referral_methods = relationship(
        "HealthcareServiceReferralMethod",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    available_times = relationship(
        "HealthcareServiceAvailableTime",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    not_available = relationship(
        "HealthcareServiceNotAvailable",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )
    endpoints = relationship(
        "HealthcareServiceEndpoint",
        back_populates="healthcare_service",
        cascade="all, delete-orphan",
    )


# ── Sub-resource tables ────────────────────────────────────────────────────────


class HealthcareServiceIdentifier(Base):
    """identifier[] — external business identifiers for this service."""

    __tablename__ = "healthcare_service_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

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

    healthcare_service = relationship("HealthcareServiceModel", back_populates="identifiers")


class HealthcareServiceCategory(Base):
    """category[] — broad classification of the service (CodeableConcept)."""

    __tablename__ = "healthcare_service_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    healthcare_service = relationship("HealthcareServiceModel", back_populates="categories")


class HealthcareServiceType(Base):
    """type[] — specific type of service within the category (CodeableConcept)."""

    __tablename__ = "healthcare_service_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    healthcare_service = relationship("HealthcareServiceModel", back_populates="types")


class HealthcareServiceSpecialty(Base):
    """specialty[] — medical specialties handled by this service (CodeableConcept)."""

    __tablename__ = "healthcare_service_specialty"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    healthcare_service = relationship("HealthcareServiceModel", back_populates="specialties")


class HealthcareServiceLocation(Base):
    """location[] — Reference(Location) places where service is delivered."""

    __tablename__ = "healthcare_service_location"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(HealthcareServiceLocationReferenceType, name="hs_location_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    healthcare_service = relationship("HealthcareServiceModel", back_populates="locations")


class HealthcareServiceTelecom(Base):
    """telecom[] — ContactPoint contact details for this service."""

    __tablename__ = "healthcare_service_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    system = Column(Enum(ContactPointSystem, name="contact_point_system"), nullable=True)
    value = Column(String, nullable=True)
    use = Column(Enum(ContactPointUse, name="contact_point_use"), nullable=True)
    rank = Column(Integer, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    healthcare_service = relationship("HealthcareServiceModel", back_populates="telecoms")


class HealthcareServiceCoverageArea(Base):
    """coverageArea[] — Reference(Location) areas where service may be provided."""

    __tablename__ = "healthcare_service_coverage_area"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(HealthcareServiceCoverageAreaReferenceType, name="hs_coverage_area_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    healthcare_service = relationship("HealthcareServiceModel", back_populates="coverage_areas")


class HealthcareServiceServiceProvisionCode(Base):
    """serviceProvisionCode[] — conditions under which service is available (CodeableConcept)."""

    __tablename__ = "healthcare_service_service_provision_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    healthcare_service = relationship(
        "HealthcareServiceModel", back_populates="service_provision_codes"
    )


class HealthcareServiceEligibility(Base):
    """eligibility[] BackboneElement — eligibility requirements for the service.

    BackboneElement fields:
      - code     (0..1 CodeableConcept)  eligibility classification
      - comment  (0..1 markdown)         explanation of the requirement
    """

    __tablename__ = "healthcare_service_eligibility"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # code (0..1 CodeableConcept)
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # comment (0..1 markdown)
    comment = Column(Text, nullable=True)

    healthcare_service = relationship("HealthcareServiceModel", back_populates="eligibilities")


class HealthcareServiceProgram(Base):
    """program[] — government or local programs this service applies to (CodeableConcept)."""

    __tablename__ = "healthcare_service_program"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    healthcare_service = relationship("HealthcareServiceModel", back_populates="programs")


class HealthcareServiceCharacteristic(Base):
    """characteristic[] — service feature/attribute codes (CodeableConcept)."""

    __tablename__ = "healthcare_service_characteristic"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    healthcare_service = relationship(
        "HealthcareServiceModel", back_populates="characteristics"
    )


class HealthcareServiceCommunication(Base):
    """communication[] — languages service is offered in (CodeableConcept)."""

    __tablename__ = "healthcare_service_communication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    healthcare_service = relationship(
        "HealthcareServiceModel", back_populates="communications"
    )


class HealthcareServiceReferralMethod(Base):
    """referralMethod[] — referral acceptance methods (CodeableConcept)."""

    __tablename__ = "healthcare_service_referral_method"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    healthcare_service = relationship(
        "HealthcareServiceModel", back_populates="referral_methods"
    )


class HealthcareServiceAvailableTime(Base):
    """availableTime[] BackboneElement — schedule of availability.

    BackboneElement fields:
      - daysOfWeek        (0..* code)    days available; comma-separated (mon,tue,...)
      - allDay            (0..1 boolean) true if available all day
      - availableStartTime (0..1 time)   HH:mm:ss opening time
      - availableEndTime   (0..1 time)   HH:mm:ss closing time
    """

    __tablename__ = "healthcare_service_available_time"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    days_of_week = Column(Text, nullable=True)           # comma-separated: mon,tue,wed,…
    all_day = Column(Boolean, nullable=True)
    available_start_time = Column(String, nullable=True)  # HH:mm:ss
    available_end_time = Column(String, nullable=True)    # HH:mm:ss

    healthcare_service = relationship(
        "HealthcareServiceModel", back_populates="available_times"
    )


class HealthcareServiceNotAvailable(Base):
    """notAvailable[] BackboneElement — periods when service is unavailable.

    BackboneElement fields:
      - description  (1..1 string)  reason for unavailability (required)
      - during       (0..1 Period)  date range of unavailability
    """

    __tablename__ = "healthcare_service_not_available"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    description = Column(String, nullable=False)          # 1..1 required
    during_start = Column(DateTime(timezone=True), nullable=True)
    during_end = Column(DateTime(timezone=True), nullable=True)

    healthcare_service = relationship(
        "HealthcareServiceModel", back_populates="not_available"
    )


class HealthcareServiceEndpoint(Base):
    """endpoint[] — Reference(Endpoint) technical access points for this service."""

    __tablename__ = "healthcare_service_endpoint"

    id = Column(Integer, primary_key=True, autoincrement=True)
    healthcare_service_id = Column(
        Integer, ForeignKey("healthcare_service.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(HealthcareServiceEndpointReferenceType, name="hs_endpoint_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    healthcare_service = relationship("HealthcareServiceModel", back_populates="endpoints")
