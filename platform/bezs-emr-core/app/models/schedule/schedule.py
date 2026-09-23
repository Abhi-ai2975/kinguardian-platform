from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Sequence,
    String,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base
from app.models.schedule.enums import ScheduleActorReferenceType

schedule_id_seq = Sequence("schedule_pub_seq", start=200000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------

class ScheduleModel(Base):
    __tablename__ = "schedule"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    schedule_id = Column(
        Integer,
        schedule_id_seq,
        server_default=schedule_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )
    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    # active (0..1)
    active = Column(Boolean, nullable=True)

    # planningHorizon (0..1) Period
    planning_horizon_start = Column(DateTime(timezone=True), nullable=True)
    planning_horizon_end = Column(DateTime(timezone=True), nullable=True)

    # comment (0..1)
    comment = Column(String, nullable=True)

    # Relationships
    identifiers = relationship(
        "ScheduleIdentifier", back_populates="schedule", cascade="all, delete-orphan"
    )
    service_categories = relationship(
        "ScheduleServiceCategory", back_populates="schedule", cascade="all, delete-orphan"
    )
    service_types = relationship(
        "ScheduleServiceType", back_populates="schedule", cascade="all, delete-orphan"
    )
    specialties = relationship(
        "ScheduleSpecialty", back_populates="schedule", cascade="all, delete-orphan"
    )
    actors = relationship(
        "ScheduleActor", back_populates="schedule", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier (0..*) child table
# ---------------------------------------------------------------------------

class ScheduleIdentifier(Base):
    __tablename__ = "schedule_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(Integer, ForeignKey("schedule.id"), nullable=False, index=True)
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

    schedule = relationship("ScheduleModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# serviceCategory (0..*) CodeableConcept child table
# ---------------------------------------------------------------------------

class ScheduleServiceCategory(Base):
    __tablename__ = "schedule_service_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(Integer, ForeignKey("schedule.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    schedule = relationship("ScheduleModel", back_populates="service_categories")


# ---------------------------------------------------------------------------
# serviceType (0..*) CodeableConcept child table
# ---------------------------------------------------------------------------

class ScheduleServiceType(Base):
    __tablename__ = "schedule_service_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(Integer, ForeignKey("schedule.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    schedule = relationship("ScheduleModel", back_populates="service_types")


# ---------------------------------------------------------------------------
# specialty (0..*) CodeableConcept child table
# ---------------------------------------------------------------------------

class ScheduleSpecialty(Base):
    __tablename__ = "schedule_specialty"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(Integer, ForeignKey("schedule.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    schedule = relationship("ScheduleModel", back_populates="specialties")


# ---------------------------------------------------------------------------
# actor (1..*) Reference child table
# ---------------------------------------------------------------------------

class ScheduleActor(Base):
    __tablename__ = "schedule_actor"

    id = Column(Integer, primary_key=True, autoincrement=True)
    schedule_id = Column(Integer, ForeignKey("schedule.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)
    reference_type = Column(
        Enum(ScheduleActorReferenceType, name="schedule_actor_reference_type"),
        nullable=True,
    )
    reference_id = Column(Integer, nullable=True)
    reference_display = Column(String, nullable=True)

    schedule = relationship("ScheduleModel", back_populates="actors")
