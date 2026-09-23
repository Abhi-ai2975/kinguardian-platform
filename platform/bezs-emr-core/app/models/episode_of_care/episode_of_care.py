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
from app.models.enums import OrganizationReferenceType
from app.models.episode_of_care.enums import (
    EpisodeOfCareAccountReferenceType,
    EpisodeOfCareCareManagerReferenceType,
    EpisodeOfCareDiagnosisReferenceType,
    EpisodeOfCarePatientReferenceType,
    EpisodeOfCareReferralRequestReferenceType,
    EpisodeOfCareStatus,
    EpisodeOfCareTeamReferenceType,
)

episode_of_care_id_seq = Sequence("episode_of_care_pub_seq", start=350000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------


class EpisodeOfCareModel(Base):
    __tablename__ = "episode_of_care"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    episode_of_care_id = Column(
        Integer,
        episode_of_care_id_seq,
        server_default=episode_of_care_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # status (1..1 code)
    status = Column(
        Enum(EpisodeOfCareStatus, name="episode_of_care_status"),
        nullable=False,
    )

    # patient (1..1 Reference(Patient))
    patient_type = Column(
        Enum(EpisodeOfCarePatientReferenceType, name="episode_of_care_patient_reference_type"),
        nullable=True,
    )
    patient_id = Column(Integer, nullable=True)
    patient_display = Column(String, nullable=True)

    # managingOrganization (0..1 Reference(Organization)) — shared enum + FK
    managing_organization_type = Column(
        Enum(OrganizationReferenceType, name="organization_reference_type", create_type=False),
        nullable=True,
    )
    managing_organization_id = Column(Integer, ForeignKey("organization.id"), nullable=True, index=True)
    managing_organization_display = Column(String, nullable=True)
    managing_organization = relationship(
        "OrganizationModel", foreign_keys=[managing_organization_id], lazy="selectin"
    )

    # period (0..1 Period)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # careManager (0..1 Reference(Practitioner|PractitionerRole))
    care_manager_type = Column(
        Enum(EpisodeOfCareCareManagerReferenceType, name="episode_of_care_care_manager_reference_type"),
        nullable=True,
    )
    care_manager_id = Column(Integer, nullable=True)
    care_manager_display = Column(String, nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # Relationships
    identifiers = relationship(
        "EpisodeOfCareIdentifier", back_populates="episode_of_care", cascade="all, delete-orphan"
    )
    status_history = relationship(
        "EpisodeOfCareStatusHistory", back_populates="episode_of_care", cascade="all, delete-orphan"
    )
    types = relationship(
        "EpisodeOfCareType", back_populates="episode_of_care", cascade="all, delete-orphan"
    )
    diagnoses = relationship(
        "EpisodeOfCareDiagnosis", back_populates="episode_of_care", cascade="all, delete-orphan"
    )
    referral_requests = relationship(
        "EpisodeOfCareReferralRequest", back_populates="episode_of_care", cascade="all, delete-orphan"
    )
    team = relationship(
        "EpisodeOfCareTeam", back_populates="episode_of_care", cascade="all, delete-orphan"
    )
    accounts = relationship(
        "EpisodeOfCareAccount", back_populates="episode_of_care", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier (0..* Identifier)
# ---------------------------------------------------------------------------


class EpisodeOfCareIdentifier(Base):
    __tablename__ = "episode_of_care_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    episode_of_care_id = Column(Integer, ForeignKey("episode_of_care.id"), nullable=False, index=True)
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

    episode_of_care = relationship("EpisodeOfCareModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# statusHistory (0..* BackboneElement)
# ---------------------------------------------------------------------------


class EpisodeOfCareStatusHistory(Base):
    __tablename__ = "episode_of_care_status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    episode_of_care_id = Column(Integer, ForeignKey("episode_of_care.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # status (1..1 code) — same value set as EpisodeOfCareStatus, stored as String
    status = Column(String, nullable=False)

    # period (1..1 Period)
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    episode_of_care = relationship("EpisodeOfCareModel", back_populates="status_history")


# ---------------------------------------------------------------------------
# type (0..* CodeableConcept)
# ---------------------------------------------------------------------------


class EpisodeOfCareType(Base):
    __tablename__ = "episode_of_care_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    episode_of_care_id = Column(Integer, ForeignKey("episode_of_care.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    episode_of_care = relationship("EpisodeOfCareModel", back_populates="types")


# ---------------------------------------------------------------------------
# diagnosis (0..* BackboneElement)
# ---------------------------------------------------------------------------


class EpisodeOfCareDiagnosis(Base):
    __tablename__ = "episode_of_care_diagnosis"

    id = Column(Integer, primary_key=True, autoincrement=True)
    episode_of_care_id = Column(Integer, ForeignKey("episode_of_care.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    # condition (1..1 Reference(Condition))
    reference_type = Column(
        Enum(EpisodeOfCareDiagnosisReferenceType, name="episode_of_care_diagnosis_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    # role (0..1 CodeableConcept)
    role_system = Column(String, nullable=True)
    role_code = Column(String, nullable=True)
    role_display = Column(String, nullable=True)
    role_text = Column(String, nullable=True)

    # rank (0..1 positiveInt)
    rank = Column(Integer, nullable=True)

    episode_of_care = relationship("EpisodeOfCareModel", back_populates="diagnoses")


# ---------------------------------------------------------------------------
# referralRequest (0..* Reference(ServiceRequest))
# ---------------------------------------------------------------------------


class EpisodeOfCareReferralRequest(Base):
    __tablename__ = "episode_of_care_referral_request"

    id = Column(Integer, primary_key=True, autoincrement=True)
    episode_of_care_id = Column(Integer, ForeignKey("episode_of_care.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(EpisodeOfCareReferralRequestReferenceType, name="episode_of_care_referral_request_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    episode_of_care = relationship("EpisodeOfCareModel", back_populates="referral_requests")


# ---------------------------------------------------------------------------
# team (0..* Reference(CareTeam))
# ---------------------------------------------------------------------------


class EpisodeOfCareTeam(Base):
    __tablename__ = "episode_of_care_team"

    id = Column(Integer, primary_key=True, autoincrement=True)
    episode_of_care_id = Column(Integer, ForeignKey("episode_of_care.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(EpisodeOfCareTeamReferenceType, name="episode_of_care_team_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    episode_of_care = relationship("EpisodeOfCareModel", back_populates="team")


# ---------------------------------------------------------------------------
# account (0..* Reference(Account))
# ---------------------------------------------------------------------------


class EpisodeOfCareAccount(Base):
    __tablename__ = "episode_of_care_account"

    id = Column(Integer, primary_key=True, autoincrement=True)
    episode_of_care_id = Column(Integer, ForeignKey("episode_of_care.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    reference_type = Column(
        Enum(EpisodeOfCareAccountReferenceType, name="episode_of_care_account_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    episode_of_care = relationship("EpisodeOfCareModel", back_populates="accounts")
