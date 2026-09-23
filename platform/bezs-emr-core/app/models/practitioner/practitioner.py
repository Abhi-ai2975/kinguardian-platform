from sqlalchemy import (
    Boolean,
    Column,
    Date,
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
from app.schemas.enums import (
    AdministrativeGender,
    AddressType,
    AddressUse,
    ContactPointSystem,
    ContactPointUse,
    HumanNameUse,
    IdentifierUse,
)

practitioner_id_seq = Sequence("practitioner_pub_seq", start=30000, increment=1, metadata=Base.metadata)


class PractitionerModel(Base):
    __tablename__ = "practitioner"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    practitioner_id = Column(
        Integer,
        practitioner_id_seq,
        server_default=practitioner_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True)
    active = Column(Boolean, nullable=True)
    gender = Column(Enum(AdministrativeGender, name="administrative_gender"), nullable=True)
    birth_date = Column(Date, nullable=True)
    deceased_boolean = Column(Boolean, nullable=True)
    deceased_datetime = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    names = relationship("PractitionerName", back_populates="practitioner", cascade="all, delete-orphan")
    identifiers = relationship("PractitionerIdentifier", back_populates="practitioner", cascade="all, delete-orphan")
    telecoms = relationship("PractitionerTelecom", back_populates="practitioner", cascade="all, delete-orphan")
    addresses = relationship("PractitionerAddress", back_populates="practitioner", cascade="all, delete-orphan")
    photos = relationship("PractitionerPhoto", back_populates="practitioner", cascade="all, delete-orphan")
    qualifications = relationship("PractitionerQualification", back_populates="practitioner", cascade="all, delete-orphan")
    communications = relationship("PractitionerCommunication", back_populates="practitioner", cascade="all, delete-orphan")


class PractitionerName(Base):
    __tablename__ = "practitioner_name"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_id = Column(Integer, ForeignKey("practitioner.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(HumanNameUse, name="human_name_use"), nullable=True)
    text = Column(String, nullable=True)
    family = Column(String, nullable=True)
    given = Column(Text, nullable=True)   # comma-separated
    prefix = Column(Text, nullable=True)  # comma-separated
    suffix = Column(Text, nullable=True)  # comma-separated
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    practitioner = relationship("PractitionerModel", back_populates="names")


class PractitionerIdentifier(Base):
    __tablename__ = "practitioner_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_id = Column(Integer, ForeignKey("practitioner.id"), nullable=False, index=True)
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

    practitioner = relationship("PractitionerModel", back_populates="identifiers")


class PractitionerTelecom(Base):
    __tablename__ = "practitioner_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_id = Column(Integer, ForeignKey("practitioner.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(Enum(ContactPointSystem, name="contact_point_system"), nullable=True)
    value = Column(String, nullable=True)
    use = Column(Enum(ContactPointUse, name="contact_point_use"), nullable=True)
    rank = Column(Integer, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    practitioner = relationship("PractitionerModel", back_populates="telecoms")


class PractitionerAddress(Base):
    __tablename__ = "practitioner_address"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_id = Column(Integer, ForeignKey("practitioner.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(AddressUse, name="address_use"), nullable=True)
    type = Column(Enum(AddressType, name="address_type"), nullable=True)
    text = Column(String, nullable=True)
    line = Column(Text, nullable=True)  # comma-separated
    city = Column(String, nullable=True)
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    practitioner = relationship("PractitionerModel", back_populates="addresses")


class PractitionerPhoto(Base):
    __tablename__ = "practitioner_photo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_id = Column(Integer, ForeignKey("practitioner.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    content_type = Column(String, nullable=True)
    language = Column(String, nullable=True)
    data = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    hash = Column(String, nullable=True)
    title = Column(String, nullable=True)
    creation = Column(DateTime(timezone=True), nullable=True)

    practitioner = relationship("PractitionerModel", back_populates="photos")


class PractitionerQualification(Base):
    __tablename__ = "practitioner_qualification"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_id = Column(Integer, ForeignKey("practitioner.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # qualification.code (1..1 CodeableConcept — flattened)
    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # qualification.status (0..1 CodeableConcept — flattened)
    status_system = Column(String, nullable=True)
    status_code = Column(String, nullable=True)
    status_display = Column(String, nullable=True)
    status_text = Column(String, nullable=True)

    # qualification.period (0..1)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # qualification.issuer (0..1 Reference(Organization) — flattened)
    issuer_type = Column(Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False), nullable=True)
    issuer_id = Column(Integer, nullable=True)
    issuer_display = Column(String, nullable=True)

    practitioner = relationship("PractitionerModel", back_populates="qualifications")
    identifiers = relationship(
        "PractitionerQualificationIdentifier",
        back_populates="qualification",
        cascade="all, delete-orphan",
    )


class PractitionerQualificationIdentifier(Base):
    __tablename__ = "practitioner_qualification_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    qualification_id = Column(Integer, ForeignKey("practitioner_qualification.id"), nullable=False, index=True)
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

    qualification = relationship("PractitionerQualification", back_populates="identifiers")


class PractitionerCommunication(Base):
    __tablename__ = "practitioner_communication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    practitioner_id = Column(Integer, ForeignKey("practitioner.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    language_system = Column(String, nullable=True)
    language_code = Column(String, nullable=False)
    language_display = Column(String, nullable=True)
    language_text = Column(String, nullable=True)
    preferred = Column(Boolean, nullable=True)

    practitioner = relationship("PractitionerModel", back_populates="communications")
