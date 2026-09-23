from sqlalchemy import (
    Column,
    String,
    DateTime,
    Integer,
    ForeignKey,
    Text,
    Boolean,
    Float,
    Sequence,
    Enum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import FHIRBase as Base
from app.models.questionnaire_response.enums import (
    QuestionnaireResponseStatus,
    QuestionnaireResponseAuthorReferenceType,
    QuestionnaireResponseSourceReferenceType,
    QRBasedOnReferenceType,
    QRPartOfReferenceType,
)
from app.models.enums import EncounterReferenceType, SubjectReferenceType, IdentifierUse

questionnaire_response_id_seq = Sequence(
    "questionnaire_response_pub_seq", start=60000, increment=1, metadata=Base.metadata
)


class QuestionnaireResponseModel(Base):
    __tablename__ = "questionnaire_response"

    # Internal PK — never exposed
    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Public ID — used in all API responses and FHIR output
    questionnaire_response_id = Column(
        Integer,
        questionnaire_response_id_seq,
        server_default=questionnaire_response_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # Required
    questionnaire = Column(String, nullable=False)  # canonical URL
    status = Column(Enum(QuestionnaireResponseStatus), nullable=False)

    # identifier (0..1 in R4 — flat columns)
    identifier_use = Column(Enum(IdentifierUse, name="identifier_use"), nullable=True)
    identifier_type_system = Column(String, nullable=True)
    identifier_type_code = Column(String, nullable=True)
    identifier_type_display = Column(String, nullable=True)
    identifier_type_text = Column(String, nullable=True)
    identifier_system = Column(String, nullable=True)
    identifier_value = Column(String, nullable=True)
    identifier_period_start = Column(DateTime(timezone=True), nullable=True)
    identifier_period_end = Column(DateTime(timezone=True), nullable=True)
    identifier_assigner = Column(String, nullable=True)

    # Subject reference — stored as type enum + integer ID
    subject_type = Column(
        Enum(SubjectReferenceType, name="subject_reference_type"),
        nullable=True,
    )
    subject_id = Column(Integer, nullable=True)
    subject_display = Column(String, nullable=True)

    # ── encounter (0..1 Reference(Encounter)) ─────────────────────────────────

    encounter_type = Column(
        Enum(EncounterReferenceType, name="encounter_reference_type", create_type=False),
        nullable=True,
    )
    encounter_id = Column(Integer, ForeignKey("encounter.id"), nullable=True, index=True)
    encounter_display = Column(String, nullable=True)

    # Authored / Author / Source
    authored = Column(DateTime(timezone=True), nullable=True)

    author_type = Column(
        Enum(QuestionnaireResponseAuthorReferenceType, name="author_reference_type"),
        nullable=True,
    )
    author_id = Column(Integer, nullable=True)
    author_display = Column(String, nullable=True)

    source_type = Column(
        Enum(QuestionnaireResponseSourceReferenceType, name="source_reference_type"),
        nullable=True,
    )
    source_id = Column(Integer, nullable=True)
    source_display = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    items = relationship(
        "QuestionnaireResponseItemModel",
        back_populates="response",
        cascade="all, delete-orphan",
        foreign_keys="QuestionnaireResponseItemModel.response_id",
    )
    based_ons = relationship(
        "QuestionnaireResponseBasedOn",
        back_populates="response",
        cascade="all, delete-orphan",
    )
    part_ofs = relationship(
        "QuestionnaireResponsePartOf",
        back_populates="response",
        cascade="all, delete-orphan",
    )
    encounter = relationship("EncounterModel", foreign_keys=[encounter_id], lazy="selectin")


class QuestionnaireResponseBasedOn(Base):
    """basedOn (0..*) — Reference(CarePlan | ServiceRequest)."""

    __tablename__ = "questionnaire_response_based_on"

    id = Column(Integer, primary_key=True, autoincrement=True)
    response_id = Column(
        Integer, ForeignKey("questionnaire_response.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)
    reference_type = Column(
        Enum(QRBasedOnReferenceType, name="qr_based_on_reference_type"), nullable=True
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    response = relationship("QuestionnaireResponseModel", back_populates="based_ons")


class QuestionnaireResponsePartOf(Base):
    """partOf (0..*) — Reference(Observation | Procedure)."""

    __tablename__ = "questionnaire_response_part_of"

    id = Column(Integer, primary_key=True, autoincrement=True)
    response_id = Column(
        Integer, ForeignKey("questionnaire_response.id"), nullable=False, index=True
    )
    org_id = Column(String, nullable=True)
    reference_type = Column(
        Enum(QRPartOfReferenceType, name="qr_part_of_reference_type"), nullable=True
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    response = relationship("QuestionnaireResponseModel", back_populates="part_ofs")


class QuestionnaireResponseItemModel(Base):
    __tablename__ = "questionnaire_response_item"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    response_id = Column(
        Integer, ForeignKey("questionnaire_response.id"), nullable=False, index=True
    )
    parent_item_id = Column(
        Integer, ForeignKey("questionnaire_response_item.id"), nullable=True, index=True
    )
    # item.answer.item — items nested under an answer (R4 §item.answer.item 0..*)
    parent_answer_id = Column(
        Integer, ForeignKey("questionnaire_response_answer.id", use_alter=True), nullable=True, index=True
    )
    org_id = Column(String, nullable=True)

    link_id = Column(String, nullable=False)
    text = Column(String, nullable=True)
    definition = Column(String, nullable=True)

    response = relationship(
        "QuestionnaireResponseModel",
        back_populates="items",
        foreign_keys=[response_id],
    )
    answers = relationship(
        "QuestionnaireResponseAnswerModel",
        back_populates="item",
        cascade="all, delete-orphan",
        foreign_keys="[QuestionnaireResponseAnswerModel.item_id]",
    )
    sub_items = relationship(
        "QuestionnaireResponseItemModel",
        cascade="all, delete-orphan",
        foreign_keys=[parent_item_id],
    )


class QuestionnaireResponseAnswerModel(Base):
    __tablename__ = "questionnaire_response_answer"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    item_id = Column(
        Integer,
        ForeignKey("questionnaire_response_item.id"),
        nullable=False,
        index=True,
    )
    org_id = Column(String, nullable=True)

    # Discriminator for which value[x] is stored (nullable — R4 value[x] is 0..1)
    value_type = Column(String, nullable=True)

    # Scalar values
    value_string = Column(Text, nullable=True)  # valueString, valueUri, valueTime, valueDate
    value_boolean = Column(Boolean, nullable=True)
    value_integer = Column(Integer, nullable=True)
    value_decimal = Column(Float, nullable=True)
    value_datetime = Column(DateTime(timezone=True), nullable=True)

    # valueCoding
    value_coding_system = Column(String, nullable=True)
    value_coding_code = Column(String, nullable=True)
    value_coding_display = Column(String, nullable=True)

    # valueReference
    value_reference = Column(String, nullable=True)
    value_reference_display = Column(String, nullable=True)

    # valueQuantity
    value_quantity_value = Column(Float, nullable=True)
    value_quantity_unit = Column(String, nullable=True)
    value_quantity_system = Column(String, nullable=True)
    value_quantity_code = Column(String, nullable=True)

    # valueAttachment
    value_attachment_content_type = Column(String, nullable=True)
    value_attachment_language = Column(String, nullable=True)
    value_attachment_data = Column(Text, nullable=True)   # base64Binary
    value_attachment_url = Column(String, nullable=True)
    value_attachment_size = Column(Integer, nullable=True)   # unsignedInt in R4
    value_attachment_hash = Column(String, nullable=True)    # base64Binary sha1
    value_attachment_title = Column(String, nullable=True)
    value_attachment_creation = Column(DateTime(timezone=True), nullable=True)

    item = relationship(
        "QuestionnaireResponseItemModel",
        back_populates="answers",
        foreign_keys="[QuestionnaireResponseAnswerModel.item_id]",
    )
    # item.answer.item — sub-items nested under this answer
    answer_items = relationship(
        "QuestionnaireResponseItemModel",
        foreign_keys="[QuestionnaireResponseItemModel.parent_answer_id]",
        cascade="all, delete-orphan",
    )
