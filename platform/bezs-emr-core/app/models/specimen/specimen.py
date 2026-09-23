from sqlalchemy import (
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
from app.models.specimen.enums import (
    SpecimenCollectorReferenceType,
    SpecimenContainerAdditiveReferenceType,
    SpecimenParentReferenceType,
    SpecimenProcessingAdditiveReferenceType,
    SpecimenRequestReferenceType,
    SpecimenStatus,
    SpecimenSubjectReferenceType,
)

specimen_id_seq = Sequence("specimen_pub_seq", start=310000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class SpecimenModel(Base):
    __tablename__ = "specimen"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    specimen_id = Column(
        Integer,
        specimen_id_seq,
        server_default=specimen_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # status (0..1 code)
    status = Column(Enum(SpecimenStatus, name="specimen_status"), nullable=True)

    # type (0..1 CodeableConcept)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)

    # subject (0..1 Reference(Patient|Group|Device|Substance|Location))
    subject_type = Column(
        Enum(SpecimenSubjectReferenceType, name="specimen_subject_reference_type"),
        nullable=True,
    )
    subject_id = Column(Integer, nullable=True)
    subject_display = Column(String, nullable=True)

    # receivedTime (0..1 dateTime)
    received_time = Column(DateTime(timezone=True), nullable=True)

    # accessionIdentifier (0..1 Identifier — flat)
    accession_identifier_use = Column(String, nullable=True)
    accession_identifier_type_system = Column(String, nullable=True)
    accession_identifier_type_code = Column(String, nullable=True)
    accession_identifier_type_display = Column(String, nullable=True)
    accession_identifier_type_text = Column(String, nullable=True)
    accession_identifier_system = Column(String, nullable=True)
    accession_identifier_value = Column(String, nullable=True)
    accession_identifier_period_start = Column(DateTime(timezone=True), nullable=True)
    accession_identifier_period_end = Column(DateTime(timezone=True), nullable=True)
    accession_identifier_assigner = Column(String, nullable=True)

    # collection (0..1 BackboneElement — flat)
    collection_collector_type = Column(
        Enum(SpecimenCollectorReferenceType, name="specimen_collector_reference_type"),
        nullable=True,
    )
    collection_collector_id = Column(Integer, nullable=True)
    collection_collector_display = Column(String, nullable=True)
    collection_collected_datetime = Column(DateTime(timezone=True), nullable=True)
    collection_collected_period_start = Column(DateTime(timezone=True), nullable=True)
    collection_collected_period_end = Column(DateTime(timezone=True), nullable=True)
    collection_duration_value = Column(Numeric, nullable=True)
    collection_duration_unit = Column(String, nullable=True)
    collection_duration_system = Column(String, nullable=True)
    collection_duration_code = Column(String, nullable=True)
    collection_quantity_value = Column(Numeric, nullable=True)
    collection_quantity_unit = Column(String, nullable=True)
    collection_quantity_system = Column(String, nullable=True)
    collection_quantity_code = Column(String, nullable=True)
    collection_method_system = Column(String, nullable=True)
    collection_method_code = Column(String, nullable=True)
    collection_method_display = Column(String, nullable=True)
    collection_method_text = Column(String, nullable=True)
    collection_body_site_system = Column(String, nullable=True)
    collection_body_site_code = Column(String, nullable=True)
    collection_body_site_display = Column(String, nullable=True)
    collection_body_site_text = Column(String, nullable=True)
    collection_fasting_status_cc_system = Column(String, nullable=True)
    collection_fasting_status_cc_code = Column(String, nullable=True)
    collection_fasting_status_cc_display = Column(String, nullable=True)
    collection_fasting_status_cc_text = Column(String, nullable=True)
    collection_fasting_status_duration_value = Column(Numeric, nullable=True)
    collection_fasting_status_duration_unit = Column(String, nullable=True)
    collection_fasting_status_duration_system = Column(String, nullable=True)
    collection_fasting_status_duration_code = Column(String, nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Relationships
    identifiers = relationship("SpecimenIdentifier", back_populates="specimen", cascade="all, delete-orphan")
    parents = relationship("SpecimenParent", back_populates="specimen", cascade="all, delete-orphan")
    requests = relationship("SpecimenRequest", back_populates="specimen", cascade="all, delete-orphan")
    processing = relationship("SpecimenProcessing", back_populates="specimen", cascade="all, delete-orphan")
    containers = relationship("SpecimenContainer", back_populates="specimen", cascade="all, delete-orphan")
    conditions = relationship("SpecimenCondition", back_populates="specimen", cascade="all, delete-orphan")
    notes = relationship("SpecimenNote", back_populates="specimen", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# identifier (0..*) — Identifier child table
# ---------------------------------------------------------------------------


class SpecimenIdentifier(Base):
    __tablename__ = "specimen_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    specimen_id = Column(Integer, ForeignKey("specimen.id"), nullable=False, index=True)
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

    specimen = relationship("SpecimenModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# parent (0..*) — Reference(Specimen) child table
# ---------------------------------------------------------------------------


class SpecimenParent(Base):
    __tablename__ = "specimen_parent"

    id = Column(Integer, primary_key=True, autoincrement=True)
    specimen_id = Column(Integer, ForeignKey("specimen.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(SpecimenParentReferenceType, name="specimen_parent_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    specimen = relationship("SpecimenModel", back_populates="parents")


# ---------------------------------------------------------------------------
# request (0..*) — Reference(ServiceRequest) child table
# ---------------------------------------------------------------------------


class SpecimenRequest(Base):
    __tablename__ = "specimen_request"

    id = Column(Integer, primary_key=True, autoincrement=True)
    specimen_id = Column(Integer, ForeignKey("specimen.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(SpecimenRequestReferenceType, name="specimen_request_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    specimen = relationship("SpecimenModel", back_populates="requests")


# ---------------------------------------------------------------------------
# processing (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class SpecimenProcessing(Base):
    __tablename__ = "specimen_processing"

    id = Column(Integer, primary_key=True, autoincrement=True)
    specimen_id = Column(Integer, ForeignKey("specimen.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    description = Column(String, nullable=True)
    procedure_system = Column(String, nullable=True)
    procedure_code = Column(String, nullable=True)
    procedure_display = Column(String, nullable=True)
    procedure_text = Column(String, nullable=True)
    time_datetime = Column(DateTime(timezone=True), nullable=True)
    time_period_start = Column(DateTime(timezone=True), nullable=True)
    time_period_end = Column(DateTime(timezone=True), nullable=True)

    specimen = relationship("SpecimenModel", back_populates="processing")
    additives = relationship("SpecimenProcessingAdditive", back_populates="processing", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# processing.additive (0..*) — grandchild Reference(Substance) table
# ---------------------------------------------------------------------------


class SpecimenProcessingAdditive(Base):
    __tablename__ = "specimen_processing_additive"

    id = Column(Integer, primary_key=True, autoincrement=True)
    processing_id = Column(Integer, ForeignKey("specimen_processing.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(SpecimenProcessingAdditiveReferenceType, name="specimen_processing_additive_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    processing = relationship("SpecimenProcessing", back_populates="additives")


# ---------------------------------------------------------------------------
# container (0..*) — BackboneElement child table
# ---------------------------------------------------------------------------


class SpecimenContainer(Base):
    __tablename__ = "specimen_container"

    id = Column(Integer, primary_key=True, autoincrement=True)
    specimen_id = Column(Integer, ForeignKey("specimen.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    description = Column(String, nullable=True)
    type_system = Column(String, nullable=True)
    type_code = Column(String, nullable=True)
    type_display = Column(String, nullable=True)
    type_text = Column(String, nullable=True)
    capacity_value = Column(Numeric, nullable=True)
    capacity_unit = Column(String, nullable=True)
    capacity_system = Column(String, nullable=True)
    capacity_code = Column(String, nullable=True)
    specimen_quantity_value = Column(Numeric, nullable=True)
    specimen_quantity_unit = Column(String, nullable=True)
    specimen_quantity_system = Column(String, nullable=True)
    specimen_quantity_code = Column(String, nullable=True)
    additive_cc_system = Column(String, nullable=True)
    additive_cc_code = Column(String, nullable=True)
    additive_cc_display = Column(String, nullable=True)
    additive_cc_text = Column(String, nullable=True)
    additive_reference_type = Column(
        Enum(SpecimenContainerAdditiveReferenceType, name="specimen_container_additive_reference_type"),
        nullable=True,
    )
    additive_reference_id = Column(Integer, nullable=True)
    additive_reference_display = Column(String, nullable=True)

    specimen = relationship("SpecimenModel", back_populates="containers")
    container_identifiers = relationship(
        "SpecimenContainerIdentifier", back_populates="container", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# container.identifier (0..*) — grandchild Identifier table
# ---------------------------------------------------------------------------


class SpecimenContainerIdentifier(Base):
    __tablename__ = "specimen_container_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    container_id = Column(Integer, ForeignKey("specimen_container.id"), nullable=False, index=True)
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

    container = relationship("SpecimenContainer", back_populates="container_identifiers")


# ---------------------------------------------------------------------------
# condition (0..*) — CodeableConcept child table
# ---------------------------------------------------------------------------


class SpecimenCondition(Base):
    __tablename__ = "specimen_condition"

    id = Column(Integer, primary_key=True, autoincrement=True)
    specimen_id = Column(Integer, ForeignKey("specimen.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    specimen = relationship("SpecimenModel", back_populates="conditions")


# ---------------------------------------------------------------------------
# note (0..*) — Annotation child table
# ---------------------------------------------------------------------------


class SpecimenNote(Base):
    __tablename__ = "specimen_note"

    id = Column(Integer, primary_key=True, autoincrement=True)
    specimen_id = Column(Integer, ForeignKey("specimen.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    text = Column(Text, nullable=False)
    time = Column(DateTime(timezone=True), nullable=True)
    author_string = Column(String, nullable=True)
    author_reference_type = Column(String, nullable=True)
    author_reference_id = Column(Integer, nullable=True)
    author_reference_display = Column(String, nullable=True)

    specimen = relationship("SpecimenModel", back_populates="notes")
