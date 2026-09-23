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
from app.models.diagnostic_report.enums import (
    DiagnosticReportBasedOnReferenceType,
    DiagnosticReportImagingStudyReferenceType,
    DiagnosticReportMediaLinkReferenceType,
    DiagnosticReportParticipantType,
    DiagnosticReportResultReferenceType,
    DiagnosticReportSpecimenReferenceType,
    DiagnosticReportStatus,
    DiagnosticReportSubjectType,
)
from app.models.enums import EncounterReferenceType

diagnostic_report_id_seq = Sequence("diagnostic_report_pub_seq", start=110000, increment=1, metadata=Base.metadata)


class DiagnosticReportModel(Base):
    __tablename__ = "diagnostic_report"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    diagnostic_report_id = Column(
        Integer,
        diagnostic_report_id_seq,
        server_default=diagnostic_report_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # ── status (1..1 code) ────────────────────────────────────────────────────

    status = Column(
        Enum(DiagnosticReportStatus, name="dr_status"), nullable=False, index=True
    )

    # ── code (1..1 CodeableConcept) — what diagnostic was requested/performed ─

    code_system = Column(String, nullable=True)
    code_code = Column(String, nullable=True, index=True)
    code_display = Column(String, nullable=True)
    code_text = Column(String, nullable=True)

    # ── subject (0..1 Reference — Patient | Group | Device | Location) ────────

    subject_type = Column(
        Enum(DiagnosticReportSubjectType, name="dr_subject_type"), nullable=True
    )
    subject_id = Column(Integer, nullable=True, index=True)
    subject_display = Column(String, nullable=True)

    # ── encounter (0..1 Reference(Encounter)) ─────────────────────────────────

    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=True, index=True)
    encounter_display = Column(String, nullable=True)

    # ── effective[x] (0..1 — dateTime | Period) ───────────────────────────────

    effective_datetime = Column(DateTime(timezone=True), nullable=True)
    effective_period_start = Column(DateTime(timezone=True), nullable=True)
    effective_period_end = Column(DateTime(timezone=True), nullable=True)

    # ── issued (0..1 instant) — when report was released ─────────────────────

    issued = Column(DateTime(timezone=True), nullable=True, index=True)

    # ── conclusion (0..1 string) — narrative summary ──────────────────────────

    conclusion = Column(Text, nullable=True)

    # ── Audit ─────────────────────────────────────────────────────────────────

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────

    encounter = relationship("EncounterModel", foreign_keys=[encounter_id], lazy="selectin")

    identifiers = relationship(
        "DiagnosticReportIdentifier",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    based_on = relationship(
        "DiagnosticReportBasedOn",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    categories = relationship(
        "DiagnosticReportCategory",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    performers = relationship(
        "DiagnosticReportPerformer",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    results_interpreters = relationship(
        "DiagnosticReportResultsInterpreter",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    specimens = relationship(
        "DiagnosticReportSpecimen",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    results = relationship(
        "DiagnosticReportResult",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    imaging_studies = relationship(
        "DiagnosticReportImagingStudy",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    media = relationship(
        "DiagnosticReportMedia",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    conclusion_codes = relationship(
        "DiagnosticReportConclusionCode",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )
    presented_forms = relationship(
        "DiagnosticReportPresentedForm",
        back_populates="diagnostic_report",
        cascade="all, delete-orphan",
    )


# ── Sub-resource tables ────────────────────────────────────────────────────────


class DiagnosticReportIdentifier(Base):
    """identifier[] — business identifiers for this report."""

    __tablename__ = "diagnostic_report_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
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

    diagnostic_report = relationship("DiagnosticReportModel", back_populates="identifiers")


class DiagnosticReportBasedOn(Base):
    """basedOn[] — Reference(CarePlan|ImmunizationRecommendation|MedicationRequest|NutritionOrder|ServiceRequest)."""

    __tablename__ = "diagnostic_report_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DiagnosticReportBasedOnReferenceType, name="dr_based_on_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    diagnostic_report = relationship("DiagnosticReportModel", back_populates="based_on")


class DiagnosticReportCategory(Base):
    """category[] — CodeableConcept classifying the diagnostic discipline (0..*)."""

    __tablename__ = "diagnostic_report_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    diagnostic_report = relationship("DiagnosticReportModel", back_populates="categories")


class DiagnosticReportPerformer(Base):
    """performer[] — Reference(Practitioner|PractitionerRole|Organization|CareTeam)."""

    __tablename__ = "diagnostic_report_performer"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DiagnosticReportParticipantType, name="dr_performer_type"), nullable=True
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    diagnostic_report = relationship("DiagnosticReportModel", back_populates="performers")


class DiagnosticReportResultsInterpreter(Base):
    """resultsInterpreter[] — Reference(Practitioner|PractitionerRole|Organization|CareTeam)."""

    __tablename__ = "diagnostic_report_results_interpreter"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DiagnosticReportParticipantType, name="dr_interpreter_type"), nullable=True
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    diagnostic_report = relationship(
        "DiagnosticReportModel", back_populates="results_interpreters"
    )


class DiagnosticReportSpecimen(Base):
    """specimen[] — Reference(Specimen) this report is based on."""

    __tablename__ = "diagnostic_report_specimen"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DiagnosticReportSpecimenReferenceType, name="dr_specimen_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    diagnostic_report = relationship("DiagnosticReportModel", back_populates="specimens")


class DiagnosticReportResult(Base):
    """result[] — Reference(Observation) observations that are part of this report."""

    __tablename__ = "diagnostic_report_result"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DiagnosticReportResultReferenceType, name="dr_result_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    diagnostic_report = relationship("DiagnosticReportModel", back_populates="results")


class DiagnosticReportImagingStudy(Base):
    """imagingStudy[] — Reference(ImagingStudy) imaging performed during investigation."""

    __tablename__ = "diagnostic_report_imaging_study"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(DiagnosticReportImagingStudyReferenceType, name="dr_imaging_study_ref_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    diagnostic_report = relationship("DiagnosticReportModel", back_populates="imaging_studies")


class DiagnosticReportMedia(Base):
    """media[] BackboneElement — key images associated with this report.

    BackboneElement fields:
      - comment  (0..1 string)       — explanation for image inclusion
      - link     (1..1 Reference(Media)) — reference to the image source
    """

    __tablename__ = "diagnostic_report_media"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    # comment (0..1 string)
    comment = Column(String, nullable=True)

    # link (1..1 Reference(Media))
    link_reference_type = Column(
        Enum(DiagnosticReportMediaLinkReferenceType, name="dr_media_link_ref_type"),
        nullable=True,
    )
    link_reference_id = Column(Integer, nullable=True)
    link_reference_display = Column(String, nullable=True)

    diagnostic_report = relationship("DiagnosticReportModel", back_populates="media")


class DiagnosticReportConclusionCode(Base):
    """conclusionCode[] — CodeableConcept codes representing the summary conclusion."""

    __tablename__ = "diagnostic_report_conclusion_code"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    diagnostic_report = relationship(
        "DiagnosticReportModel", back_populates="conclusion_codes"
    )


class DiagnosticReportPresentedForm(Base):
    """presentedForm[] — Attachment with the full report content.

    Attachment datatype fields:
      - contentType  (0..1 code)          MIME type
      - language     (0..1 code)          BCP-47 language code
      - data         (0..1 base64Binary)  actual binary content
      - url          (0..1 url)           location where data can be accessed
      - size         (0..1 unsignedInt)   byte count before base64 encoding
      - hash         (0..1 base64Binary)  SHA-1 hash of the data
      - title        (0..1 string)        label to display in place of data
      - creation     (0..1 dateTime)      when attachment was first created
    """

    __tablename__ = "diagnostic_report_presented_form"

    id = Column(Integer, primary_key=True, autoincrement=True)
    diagnostic_report_id = Column(
        Integer, ForeignKey("diagnostic_report.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)

    content_type = Column(String, nullable=True)
    language = Column(String, nullable=True)
    data = Column(Text, nullable=True)
    url = Column(String, nullable=True)
    size = Column(Integer, nullable=True)
    hash = Column(String, nullable=True)
    title = Column(String, nullable=True)
    creation = Column(DateTime(timezone=True), nullable=True)

    diagnostic_report = relationship(
        "DiagnosticReportModel", back_populates="presented_forms"
    )
