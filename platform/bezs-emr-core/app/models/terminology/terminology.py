from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import JSONB, TSVECTOR
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase


class TerminologyCodeSystem(FHIRBase):
    __tablename__ = "terminology_code_system"

    id = Column(Integer, primary_key=True, autoincrement=True)
    canonical_url = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    version = Column(String, nullable=True)
    fhir_version = Column(String, nullable=True)
    publisher = Column(String, nullable=True)
    jurisdiction = Column(String, nullable=True)
    content_mode = Column(String, nullable=True)
    experimental = Column(Boolean, default=False)
    active = Column(Boolean, nullable=False, default=True, server_default=true())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    concepts = relationship(
        "TerminologyConcept",
        back_populates="code_system",
        cascade="all, delete-orphan",
    )


class TerminologyConcept(FHIRBase):
    __tablename__ = "terminology_concept"
    __table_args__ = (
        Index(
            "uq_terminology_concept_system_code_null_org",
            "code_system_id", "code",
            unique=True,
            postgresql_where=text("org_id IS NULL"),
        ),
        Index(
            "uq_terminology_concept_system_code_org",
            "code_system_id", "code", "org_id",
            unique=True,
            postgresql_where=text("org_id IS NOT NULL"),
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    code_system_id = Column(
        Integer, ForeignKey("terminology_code_system.id"), nullable=False, index=True
    )
    code = Column(String, nullable=False, index=True)
    display = Column(String, nullable=False)
    definition = Column(Text, nullable=True)
    active = Column(Boolean, default=True, server_default=true())
    deprecated = Column(Boolean, default=False)
    parent_concept_id = Column(
        Integer, ForeignKey("terminology_concept.id"), nullable=True, index=True
    )
    search_vector = Column(TSVECTOR, nullable=True)
    org_id = Column(String, nullable=True, index=True)
    user_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    code_system = relationship("TerminologyCodeSystem", back_populates="concepts")
    synonyms = relationship(
        "TerminologyConceptSynonym",
        back_populates="concept",
        cascade="all, delete-orphan",
    )
    translations = relationship(
        "TerminologyConceptTranslation",
        back_populates="concept",
        cascade="all, delete-orphan",
    )
    embedding = relationship(
        "TerminologyConceptEmbedding",
        back_populates="concept",
        uselist=False,
        cascade="all, delete-orphan",
    )


class TerminologyConceptSynonym(FHIRBase):
    """Alternate names for a concept — powers NLP and semantic search."""

    __tablename__ = "terminology_concept_synonym"

    id = Column(Integer, primary_key=True, autoincrement=True)
    concept_id = Column(
        Integer, ForeignKey("terminology_concept.id"), nullable=False, index=True
    )
    synonym = Column(String, nullable=False)

    concept = relationship("TerminologyConcept", back_populates="synonyms")


class TerminologyConceptTranslation(FHIRBase):
    """Multilingual display names per concept."""

    __tablename__ = "terminology_concept_translation"
    __table_args__ = (UniqueConstraint("concept_id", "language_code"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    concept_id = Column(
        Integer, ForeignKey("terminology_concept.id"), nullable=False, index=True
    )
    language_code = Column(String, nullable=False)
    display = Column(String, nullable=False)

    concept = relationship("TerminologyConcept", back_populates="translations")


class TerminologyRelationship(FHIRBase):
    """IS-A, part-of, and other semantic relationships between concepts."""

    __tablename__ = "terminology_relationship"
    __table_args__ = (
        UniqueConstraint("parent_concept_id", "child_concept_id", "relationship_type"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    parent_concept_id = Column(
        Integer, ForeignKey("terminology_concept.id"), nullable=False, index=True
    )
    child_concept_id = Column(
        Integer, ForeignKey("terminology_concept.id"), nullable=False, index=True
    )
    relationship_type = Column(String, nullable=False)


class TerminologyValueSet(FHIRBase):
    """A named subset of codes allowed for a specific clinical use case."""

    __tablename__ = "terminology_value_set"

    id = Column(Integer, primary_key=True, autoincrement=True)
    canonical_url = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    title = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    version = Column(String, nullable=True)
    fhir_version = Column(String, nullable=True)
    binding_strength = Column(String, nullable=False)
    experimental = Column(Boolean, default=False)
    active = Column(Boolean, default=True, server_default=true())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    concepts = relationship(
        "TerminologyValueSetConcept",
        back_populates="value_set",
        cascade="all, delete-orphan",
    )
    field_bindings = relationship(
        "TerminologyFieldBinding",
        back_populates="value_set",
        cascade="all, delete-orphan",
    )


class TerminologyValueSetConcept(FHIRBase):
    """Many-to-many join: a concept can belong to multiple ValueSets."""

    __tablename__ = "terminology_value_set_concept"
    __table_args__ = (UniqueConstraint("value_set_id", "concept_id"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    value_set_id = Column(
        Integer, ForeignKey("terminology_value_set.id"), nullable=False, index=True
    )
    concept_id = Column(
        Integer, ForeignKey("terminology_concept.id"), nullable=False, index=True
    )
    active = Column(Boolean, default=True, server_default=true())

    value_set = relationship("TerminologyValueSet", back_populates="concepts")
    concept = relationship("TerminologyConcept")


class TerminologyFieldBinding(FHIRBase):
    """Maps a FHIR resource.field to the ValueSet that governs its allowed codes."""

    __tablename__ = "terminology_field_binding"
    __table_args__ = (UniqueConstraint("resource_type", "field_name"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    resource_type = Column(String, nullable=False, index=True)
    field_name = Column(String, nullable=False)
    value_set_id = Column(
        Integer, ForeignKey("terminology_value_set.id"), nullable=False, index=True
    )
    binding_strength = Column(String, nullable=False)
    multiple_allowed = Column(Boolean, default=False)
    active = Column(Boolean, default=True, server_default=true())

    value_set = relationship("TerminologyValueSet", back_populates="field_bindings")


class TerminologyConceptEmbedding(FHIRBase):
    """Vector embedding for semantic similarity search.

    Stored as JSONB (float array) until pgvector extension is installed,
    at which point the column should be migrated to vector(1536).
    """

    __tablename__ = "terminology_concept_embedding"

    id = Column(Integer, primary_key=True, autoincrement=True)
    concept_id = Column(
        Integer,
        ForeignKey("terminology_concept.id"),
        nullable=False,
        unique=True,
        index=True,
    )
    embedding = Column(JSONB, nullable=True)
    model = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    concept = relationship("TerminologyConcept", back_populates="embedding")


class TerminologyAuditLog(FHIRBase):
    """Governance trail for all terminology changes."""

    __tablename__ = "terminology_audit_log"

    id = Column(Integer, primary_key=True, autoincrement=True)
    action = Column(String, nullable=False, index=True)
    concept_id = Column(
        Integer, ForeignKey("terminology_concept.id"), nullable=True, index=True
    )
    value_set_id = Column(
        Integer, ForeignKey("terminology_value_set.id"), nullable=True, index=True
    )
    performed_by = Column(String, nullable=True)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TerminologyConceptMap(FHIRBase):
    """Cross-system concept mappings — e.g. ICD-10 ↔ SNOMED, LOINC ↔ local lab codes."""

    __tablename__ = "terminology_concept_map"
    __table_args__ = (
        UniqueConstraint("source_concept_id", "target_concept_id", "mapping_type"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_concept_id = Column(
        Integer, ForeignKey("terminology_concept.id"), nullable=False, index=True
    )
    target_concept_id = Column(
        Integer, ForeignKey("terminology_concept.id"), nullable=False, index=True
    )
    mapping_type = Column(String, nullable=True)
    confidence = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    source_concept = relationship(
        "TerminologyConcept", foreign_keys=[source_concept_id]
    )
    target_concept = relationship(
        "TerminologyConcept", foreign_keys=[target_concept_id]
    )
