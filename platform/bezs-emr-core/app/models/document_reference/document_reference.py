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
from app.models.document_reference.enums import (
    DocumentReferenceAuthorReferenceType,
    DocumentReferenceAuthenticatorReferenceType,
    DocumentReferenceContextEncounterType,
    DocumentReferenceContextSourcePatientInfoType,
    DocumentReferenceDocStatus,
    DocumentReferenceRelatesToCode,
    DocumentReferenceRelatesToTargetType,
    DocumentReferenceStatus,
    DocumentReferenceSubjectReferenceType,
)
from app.models.enums import OrganizationReferenceType

document_reference_id_seq = Sequence("document_reference_pub_seq", start=320000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class DocumentReferenceModel(Base):
    __tablename__ = "document_reference"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    document_reference_id = Column(
        Integer,
        document_reference_id_seq,
        server_default=document_reference_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # masterIdentifier (0..1 Identifier — flat)
    master_identifier_use = Column(String, nullable=True)
    master_identifier_type_system = Column(String, nullable=True)
    master_identifier_type_code = Column(String, nullable=True)
    master_identifier_type_display = Column(String, nullable=True)
    master_identifier_type_text = Column(String, nullable=True)
    master_identifier_system = Column(String, nullable=True)
    master_identifier_value = Column(String, nullable=True)
    master_identifier_period_start = Column(DateTime(timezone=True), nullable=True)
    master_identifier_period_end = Column(DateTime(timezone=True), nullable=True)
    master_identifier_assigner = Column(String, nullable=True)

    # status (1..1 code)
    status = Column(
        Enum(DocumentReferenceStatus, name="document_reference_status"),
        nullable=False,
    )

    # docStatus (0..1 code)
    doc_status = Column(
        Enum(DocumentReferenceDocStatus, name="document_reference_doc_status"),
        nullable=True,
    )

    # type (0..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # subject (0..1 Reference(Patient|Practitioner|Group|Device))
    subject_type = Column(
        Enum(DocumentReferenceSubjectReferenceType, name="document_reference_subject_reference_type"),
        nullable=True,
    )
    subject_id = Column(Integer, nullable=True)
    subject_display = Column(String, nullable=True)

    # date (0..1 instant)
    date = Column(DateTime(timezone=True), nullable=True)

    # authenticator (0..1 Reference(Practitioner|PractitionerRole|Organization))
    authenticator_type = Column(
        Enum(DocumentReferenceAuthenticatorReferenceType, name="document_reference_authenticator_reference_type"),
        nullable=True,
    )
    authenticator_id = Column(Integer, nullable=True)
    authenticator_display = Column(String, nullable=True)

    # custodian (0..1 Reference(Organization)) — shared enum
    custodian_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    custodian_id = Column(Integer, ForeignKey("organization.id"), nullable=True, index=True)
    custodian_display = Column(String, nullable=True)
    custodian = relationship("OrganizationModel", foreign_keys=[custodian_id], lazy="selectin")

    # description (0..1 string)
    description = Column(String, nullable=True)

    # context (0..1 BackboneElement — flat)
    context_period_start = Column(DateTime(timezone=True), nullable=True)
    context_period_end = Column(DateTime(timezone=True), nullable=True)
    context_facility_type_system = Column(String, nullable=True)
    context_facility_type_code = Column(String, nullable=True)
    context_facility_type_display = Column(String, nullable=True)
    context_facility_type_text = Column(String, nullable=True)
    context_practice_setting_system = Column(String, nullable=True)
    context_practice_setting_code = Column(String, nullable=True)
    context_practice_setting_display = Column(String, nullable=True)
    context_practice_setting_text = Column(String, nullable=True)
    context_source_patient_info_type = Column(
        Enum(
            DocumentReferenceContextSourcePatientInfoType,
            name="document_reference_context_source_patient_info_type",
        ),
        nullable=True,
    )
    context_source_patient_info_id = Column(Integer, nullable=True)
    context_source_patient_info_display = Column(String, nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Relationships
    identifiers = relationship("DocumentReferenceIdentifier", back_populates="document_reference", cascade="all, delete-orphan")
    categories = relationship("DocumentReferenceCategory", back_populates="document_reference", cascade="all, delete-orphan")
    authors = relationship("DocumentReferenceAuthor", back_populates="document_reference", cascade="all, delete-orphan")
    relates_to = relationship("DocumentReferenceRelatesTo", back_populates="document_reference", cascade="all, delete-orphan")
    security_labels = relationship("DocumentReferenceSecurityLabel", back_populates="document_reference", cascade="all, delete-orphan")
    content = relationship("DocumentReferenceContent", back_populates="document_reference", cascade="all, delete-orphan")
    context_encounters = relationship("DocumentReferenceContextEncounter", back_populates="document_reference", cascade="all, delete-orphan")
    context_events = relationship("DocumentReferenceContextEvent", back_populates="document_reference", cascade="all, delete-orphan")
    context_related = relationship("DocumentReferenceContextRelated", back_populates="document_reference", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class DocumentReferenceIdentifier(Base):
    __tablename__ = "document_reference_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_reference_id = Column(Integer, ForeignKey("document_reference.id"), nullable=False, index=True)
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

    document_reference = relationship("DocumentReferenceModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# category (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class DocumentReferenceCategory(Base):
    __tablename__ = "document_reference_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_reference_id = Column(Integer, ForeignKey("document_reference.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    document_reference = relationship("DocumentReferenceModel", back_populates="categories")


# ---------------------------------------------------------------------------
# author (0..*) — Reference child table
# ---------------------------------------------------------------------------


class DocumentReferenceAuthor(Base):
    __tablename__ = "document_reference_author"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_reference_id = Column(Integer, ForeignKey("document_reference.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DocumentReferenceAuthorReferenceType, name="document_reference_author_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    document_reference = relationship("DocumentReferenceModel", back_populates="authors")


# ---------------------------------------------------------------------------
# relatesTo (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class DocumentReferenceRelatesTo(Base):
    __tablename__ = "document_reference_relates_to"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_reference_id = Column(Integer, ForeignKey("document_reference.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    code = Column(
        Enum(DocumentReferenceRelatesToCode, name="document_reference_relates_to_code"),
        nullable=False,
    )
    target_type = Column(
        Enum(DocumentReferenceRelatesToTargetType, name="document_reference_relates_to_target_type"),
        nullable=True,
    )
    target_id = Column(Integer, nullable=True)
    target_display = Column(String, nullable=True)

    document_reference = relationship("DocumentReferenceModel", back_populates="relates_to")


# ---------------------------------------------------------------------------
# securityLabel (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class DocumentReferenceSecurityLabel(Base):
    __tablename__ = "document_reference_security_label"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_reference_id = Column(Integer, ForeignKey("document_reference.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    document_reference = relationship("DocumentReferenceModel", back_populates="security_labels")


# ---------------------------------------------------------------------------
# content (1..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class DocumentReferenceContent(Base):
    __tablename__ = "document_reference_content"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_reference_id = Column(Integer, ForeignKey("document_reference.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # attachment (1..1 Attachment)
    attachment_content_type = Column(String, nullable=True)
    attachment_language = Column(String, nullable=True)
    attachment_data = Column(Text, nullable=True)
    attachment_url = Column(String, nullable=True)
    attachment_size = Column(Integer, nullable=True)
    attachment_hash = Column(String, nullable=True)
    attachment_title = Column(String, nullable=True)
    attachment_creation = Column(DateTime(timezone=True), nullable=True)

    # format (0..1 Coding)
    format_system = Column(String, nullable=True)
    format_version = Column(String, nullable=True)
    format_code = Column(String, nullable=True)
    format_display = Column(String, nullable=True)

    document_reference = relationship("DocumentReferenceModel", back_populates="content")


# ---------------------------------------------------------------------------
# context.encounter (0..*) — Reference child table
# ---------------------------------------------------------------------------


class DocumentReferenceContextEncounter(Base):
    __tablename__ = "document_reference_context_encounter"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_reference_id = Column(Integer, ForeignKey("document_reference.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DocumentReferenceContextEncounterType, name="document_reference_context_encounter_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    document_reference = relationship("DocumentReferenceModel", back_populates="context_encounters")


# ---------------------------------------------------------------------------
# context.event (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class DocumentReferenceContextEvent(Base):
    __tablename__ = "document_reference_context_event"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_reference_id = Column(Integer, ForeignKey("document_reference.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    document_reference = relationship("DocumentReferenceModel", back_populates="context_events")


# ---------------------------------------------------------------------------
# context.related (0..*) — open Reference child table
# ---------------------------------------------------------------------------


class DocumentReferenceContextRelated(Base):
    __tablename__ = "document_reference_context_related"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_reference_id = Column(Integer, ForeignKey("document_reference.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(String, nullable=True)
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    document_reference = relationship("DocumentReferenceModel", back_populates="context_related")
