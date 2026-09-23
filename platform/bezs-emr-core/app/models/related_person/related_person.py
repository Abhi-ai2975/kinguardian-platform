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
from app.schemas.enums import (
    AdministrativeGender,
    AddressType,
    AddressUse,
    ContactPointSystem,
    ContactPointUse,
    HumanNameUse,
    IdentifierUse,
)
from app.models.related_person.enums import RelatedPersonPatientReferenceType

related_person_id_seq = Sequence("related_person_pub_seq", start=300000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class RelatedPersonModel(Base):
    __tablename__ = "related_person"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    related_person_id = Column(
        Integer,
        related_person_id_seq,
        server_default=related_person_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── active (0..1 boolean) ─────────────────────────────────────────────────
    active = Column(Boolean, nullable=True)

    # ── patient (1..1 Reference(Patient)) ────────────────────────────────────
    patient_type = Column(
        Enum(RelatedPersonPatientReferenceType, name="related_person_patient_reference_type"),
        nullable=True,
    )
    patient_id = Column(Integer, ForeignKey("patient.id"), nullable=True, index=True)
    patient_display = Column(String, nullable=True)
    patient = relationship("PatientModel", foreign_keys=[patient_id], lazy="selectin")

    # ── gender (0..1 code) ────────────────────────────────────────────────────
    gender = Column(
        Enum(AdministrativeGender, name="administrative_gender", create_type=False),
        nullable=True,
    )

    # ── birthDate (0..1 date) ─────────────────────────────────────────────────
    birth_date = Column(Date, nullable=True)

    # ── period (0..1 Period) ──────────────────────────────────────────────────
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    identifiers = relationship(
        "RelatedPersonIdentifier", back_populates="related_person", cascade="all, delete-orphan"
    )
    relationships = relationship(
        "RelatedPersonRelationship", back_populates="related_person", cascade="all, delete-orphan"
    )
    names = relationship(
        "RelatedPersonName", back_populates="related_person", cascade="all, delete-orphan"
    )
    telecoms = relationship(
        "RelatedPersonTelecom", back_populates="related_person", cascade="all, delete-orphan"
    )
    addresses = relationship(
        "RelatedPersonAddress", back_populates="related_person", cascade="all, delete-orphan"
    )
    photos = relationship(
        "RelatedPersonPhoto", back_populates="related_person", cascade="all, delete-orphan"
    )
    communications = relationship(
        "RelatedPersonCommunication", back_populates="related_person", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class RelatedPersonIdentifier(Base):
    __tablename__ = "related_person_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    related_person_id = Column(Integer, ForeignKey("related_person.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(IdentifierUse, name="identifier_use", create_type=False), nullable=True)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)
    system = Column(String, nullable=True)
    value = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)
    assigner = Column(String, nullable=True)

    related_person = relationship("RelatedPersonModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# relationship (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class RelatedPersonRelationship(Base):
    __tablename__ = "related_person_relationship"

    id = Column(Integer, primary_key=True, autoincrement=True)
    related_person_id = Column(Integer, ForeignKey("related_person.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    related_person = relationship("RelatedPersonModel", back_populates="relationships")


# ---------------------------------------------------------------------------
# name (0..*) — HumanName child table
# ---------------------------------------------------------------------------


class RelatedPersonName(Base):
    __tablename__ = "related_person_name"

    id = Column(Integer, primary_key=True, autoincrement=True)
    related_person_id = Column(Integer, ForeignKey("related_person.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(HumanNameUse, name="human_name_use", create_type=False), nullable=True)
    text = Column(String, nullable=True)
    family = Column(String, nullable=True)
    given = Column(Text, nullable=True)   # comma-separated
    prefix = Column(Text, nullable=True)  # comma-separated
    suffix = Column(Text, nullable=True)  # comma-separated
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    related_person = relationship("RelatedPersonModel", back_populates="names")


# ---------------------------------------------------------------------------
# telecom (0..*) — ContactPoint child table
# ---------------------------------------------------------------------------


class RelatedPersonTelecom(Base):
    __tablename__ = "related_person_telecom"

    id = Column(Integer, primary_key=True, autoincrement=True)
    related_person_id = Column(Integer, ForeignKey("related_person.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    system = Column(Enum(ContactPointSystem, name="contact_point_system", create_type=False), nullable=True)
    value = Column(String, nullable=True)
    use = Column(Enum(ContactPointUse, name="contact_point_use", create_type=False), nullable=True)
    rank = Column(Integer, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    related_person = relationship("RelatedPersonModel", back_populates="telecoms")


# ---------------------------------------------------------------------------
# address (0..*) — Address child table
# ---------------------------------------------------------------------------


class RelatedPersonAddress(Base):
    __tablename__ = "related_person_address"

    id = Column(Integer, primary_key=True, autoincrement=True)
    related_person_id = Column(Integer, ForeignKey("related_person.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    use = Column(Enum(AddressUse, name="address_use", create_type=False), nullable=True)
    type = Column(Enum(AddressType, name="address_type", create_type=False), nullable=True)
    text = Column(String, nullable=True)
    line = Column(Text, nullable=True)   # comma-separated
    city = Column(String, nullable=True)
    district = Column(String, nullable=True)
    state = Column(String, nullable=True)
    postal_code = Column(String, nullable=True)
    country = Column(String, nullable=True)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    related_person = relationship("RelatedPersonModel", back_populates="addresses")


# ---------------------------------------------------------------------------
# photo (0..*) — Attachment child table
# ---------------------------------------------------------------------------


class RelatedPersonPhoto(Base):
    __tablename__ = "related_person_photo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    related_person_id = Column(Integer, ForeignKey("related_person.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    content_type = Column(String, nullable=True)
    language = Column(String, nullable=True)
    data = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    hash = Column(String, nullable=True)
    title = Column(String, nullable=True)
    creation = Column(DateTime(timezone=True), nullable=True)

    related_person = relationship("RelatedPersonModel", back_populates="photos")


# ---------------------------------------------------------------------------
# communication (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class RelatedPersonCommunication(Base):
    __tablename__ = "related_person_communication"

    id = Column(Integer, primary_key=True, autoincrement=True)
    related_person_id = Column(Integer, ForeignKey("related_person.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # communication.language (1..1 CodeableConcept — flattened)
    language_system = Column(String, nullable=True)
    language_code = Column(String, nullable=True)
    language_display = Column(String, nullable=True)
    language_text = Column(String, nullable=True)

    # communication.preferred (0..1 boolean)
    preferred = Column(Boolean, nullable=True)

    related_person = relationship("RelatedPersonModel", back_populates="communications")
