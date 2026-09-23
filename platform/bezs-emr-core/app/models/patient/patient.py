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
from app.models.patient.enums import (
    PatientGender,
    PatientGeneralPractitionerType,
    PatientLinkOtherType,
    PatientLinkType,
)
from app.models.enums import OrganizationReferenceType
from app.schemas.enums import (
    AddressType,
    AddressUse,
    ContactPointSystem,
    ContactPointUse,
    HumanNameUse,
    IdentifierUse,
)

patient_id_seq = Sequence("patient_pub_seq", start=10000, increment=1, metadata=Base.metadata)


class PatientModel(Base):
    __tablename__ = "patient"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    patient_id = Column(
        Integer,
        patient_id_seq,
        server_default=patient_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    active = Column(Boolean, nullable=True, default=True)
    gender = Column(Enum(PatientGender, name="patient_gender"), nullable=True)
    birth_date = Column(Date, nullable=True)

    # deceased[x] — boolean | dateTime choice type
    deceased_boolean = Column(Boolean, nullable=True)
    deceased_datetime = Column(DateTime(timezone=True), nullable=True)

    # maritalStatus (0..1 CodeableConcept) — flattened
    marital_status_system = Column(String, nullable=True)
    marital_status_code = Column(String, nullable=True)
    marital_status_display = Column(String, nullable=True)
    marital_status_text = Column(String, nullable=True)

    # multipleBirth[x] — boolean | integer choice type
    multiple_birth_boolean = Column(Boolean, nullable=True)
    multiple_birth_integer = Column(Integer, nullable=True)

    # managingOrganization (0..1 Reference(Organization)) — flattened
    managing_organization_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type"),
        nullable=True,
    )
    managing_organization_id = Column(Integer, nullable=True)
    managing_organization_display = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    identifiers = relationship(
        "PatientIdentifier", back_populates="patient", cascade="all, delete-orphan",
    )
    names = relationship(
        "PatientName", back_populates="patient", cascade="all, delete-orphan",
    )
    telecoms = relationship(
        "PatientTelecom", back_populates="patient", cascade="all, delete-orphan",
    )
    addresses = relationship(
        "PatientAddress", back_populates="patient", cascade="all, delete-orphan",
    )
    photos = relationship(
        "PatientPhoto", back_populates="patient", cascade="all, delete-orphan",
    )
    contacts = relationship(
        "PatientContact", back_populates="patient", cascade="all, delete-orphan",
    )
    communications = relationship(
        "PatientCommunication", back_populates="patient", cascade="all, delete-orphan",
    )
    general_practitioners = relationship(
        "PatientGeneralPractitioner", back_populates="patient", cascade="all, delete-orphan",
    )
    links = relationship(
        "PatientLink", back_populates="patient", cascade="all, delete-orphan",
    )


# ── Sub-resource tables ────────────────────────────────────────────────────────


class PatientIdentifier(Base):
    """identifier[] — Identifier — business identifiers for this patient."""

    __tablename__ = "patient_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(IdentifierUse, name="identifier_use"), nullable=True)
    # Identifier.type is a CodeableConcept — single coding flattened + text
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)
    system = Column(String, nullable=True)
    value = Column(String, nullable=False)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    assigner = Column(String, nullable=True)

    patient = relationship("PatientModel", back_populates="identifiers")


class PatientName(Base):
    """name[] — HumanName — names associated with the patient.

    given/prefix/suffix stored comma-separated — never individually filtered.
    """

    __tablename__ = "patient_name"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(HumanNameUse, name="human_name_use"), nullable=True)
    text = Column(String, nullable=True)
    family = Column(String, nullable=True)
    given = Column(Text, nullable=True)    # comma-separated given names
    prefix = Column(Text, nullable=True)   # comma-separated prefixes
    suffix = Column(Text, nullable=True)   # comma-separated suffixes
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    patient = relationship("PatientModel", back_populates="names")


class PatientTelecom(Base):
    """telecom[] — ContactPoint — contact details for the patient."""

    __tablename__ = "patient_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(Enum(ContactPointSystem, name="contact_point_system"), nullable=True)
    value = Column(String, nullable=True)
    use = Column(Enum(ContactPointUse, name="contact_point_use"), nullable=True)
    rank = Column(Integer, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    patient = relationship("PatientModel", back_populates="telecoms")


class PatientAddress(Base):
    """address[] — Address — addresses for the patient.

    line stored comma-separated — address lines are never individually filtered.
    """

    __tablename__ = "patient_address"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(AddressUse, name="address_use"), nullable=True)
    type = Column(Enum(AddressType, name="address_type"), nullable=True)
    text = Column(String, nullable=True)
    line = Column(Text, nullable=True)     # comma-separated address lines
    city = Column(String, nullable=True)
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    patient = relationship("PatientModel", back_populates="addresses")


class PatientPhoto(Base):
    """photo[] — Attachment — images of the patient."""

    __tablename__ = "patient_photo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    content_type = Column(String, nullable=True)
    language = Column(String, nullable=True)
    data = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    hash = Column(String, nullable=True)
    title = Column(String, nullable=True)
    creation = Column(DateTime(timezone=True), nullable=True)

    patient = relationship("PatientModel", back_populates="photos")


class PatientContact(Base):
    """contact[] BackboneElement — guardian, next-of-kin, or emergency contact.

    R4 fields: relationship (0..*), name (0..1), telecom (0..*), address (0..1),
               gender (0..1), organization (0..1 Reference), period (0..1).
    name and address are 0..1 so they are flattened onto this table.
    relationship and telecom are 0..* so they become grandchild tables.
    """

    __tablename__ = "patient_contact"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # name (0..1 HumanName) — flattened
    name_use = Column(Enum(HumanNameUse, name="human_name_use"), nullable=True)
    name_text = Column(String, nullable=True)
    name_family = Column(String, nullable=True)
    name_given = Column(Text, nullable=True)    # comma-separated
    name_prefix = Column(Text, nullable=True)   # comma-separated
    name_suffix = Column(Text, nullable=True)   # comma-separated

    # address (0..1 Address) — flattened
    address_use = Column(Enum(AddressUse, name="address_use"), nullable=True)
    address_type = Column(Enum(AddressType, name="address_type"), nullable=True)
    address_text = Column(String, nullable=True)
    address_line = Column(Text, nullable=True)  # comma-separated
    address_city = Column(String, nullable=True)
    address_district = Column(String, nullable=True)
    address_state = Column(String, nullable=True)
    address_postal_code = Column(String, nullable=True)
    address_country = Column(String, nullable=True)
    address_period_start = Column(DateTime(timezone=True), nullable=True)
    address_period_end = Column(DateTime(timezone=True), nullable=True)

    gender = Column(Enum(PatientGender, name="patient_gender"), nullable=True)

    # organization (0..1 Reference(Organization)) — flattened
    organization_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    organization_id = Column(Integer, nullable=True)
    organization_display = Column(String, nullable=True)

    # period (0..1 Period) — flattened
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    patient = relationship("PatientModel", back_populates="contacts")
    relationships = relationship(
        "PatientContactRelationship", back_populates="contact", cascade="all, delete-orphan",
    )
    telecoms = relationship(
        "PatientContactTelecom", back_populates="contact", cascade="all, delete-orphan",
    )


class PatientContactRelationship(Base):
    """contact[].relationship[] — CodeableConcept — nature of relationship to patient."""

    __tablename__ = "patient_contact_relationship"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(Integer, ForeignKey("patient_contact.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    contact = relationship("PatientContact", back_populates="relationships")


class PatientContactTelecom(Base):
    """contact[].telecom[] — ContactPoint — contact details for the contact person."""

    __tablename__ = "patient_contact_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contact_id = Column(Integer, ForeignKey("patient_contact.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(Enum(ContactPointSystem, name="contact_point_system"), nullable=True)
    value = Column(String, nullable=True)
    use = Column(Enum(ContactPointUse, name="contact_point_use"), nullable=True)
    rank = Column(Integer, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    contact = relationship("PatientContact", back_populates="telecoms")


class PatientCommunication(Base):
    """communication[] BackboneElement — languages the patient can use for healthcare.

    language (1..1 CodeableConcept) — flattened; preferred (0..1 boolean).
    """

    __tablename__ = "patient_communication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    language_system = Column(String, nullable=True)
    language_code = Column(String, nullable=True)
    language_display = Column(String, nullable=True)
    language_text = Column(String, nullable=True)
    preferred = Column(Boolean, nullable=True)

    patient = relationship("PatientModel", back_populates="communications")


class PatientGeneralPractitioner(Base):
    """generalPractitioner[] — Reference(Organization|Practitioner|PractitionerRole)."""

    __tablename__ = "patient_general_practitioner"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(PatientGeneralPractitionerType, name="patient_gp_type"), nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    patient = relationship("PatientModel", back_populates="general_practitioners")


class PatientLink(Base):
    """link[] BackboneElement — links to related Patient or RelatedPerson records.

    other (1..1 Reference), type (1..1 code).
    """

    __tablename__ = "patient_link"

    id = Column(Integer, primary_key=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    other_type = Column(
        Enum(PatientLinkOtherType, name="patient_link_other_type"), nullable=True,
    )
    other_id = Column(Integer, nullable=True)
    other_display = Column(String, nullable=True)
    type = Column(
        Enum(PatientLinkType, name="patient_link_type"), nullable=False,
    )

    patient = relationship("PatientModel", back_populates="links")
