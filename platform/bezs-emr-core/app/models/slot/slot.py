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
from app.models.slot.enums import SlotScheduleReferenceType, SlotStatus
from app.schemas.enums import IdentifierUse

slot_id_seq = Sequence("slot_pub_seq", start=220000, increment=1, metadata=Base.metadata)


# ---------------------------------------------------------------------------
# Main table
# ---------------------------------------------------------------------------

class SlotModel(Base):
    __tablename__ = "slot"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    slot_id = Column(
        Integer,
        slot_id_seq,
        server_default=slot_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    user_id = Column(String, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # schedule (1..1 Reference(Schedule))
    schedule_type = Column(
        Enum(SlotScheduleReferenceType, name="slot_schedule_reference_type"),
        nullable=True,
    )
    schedule_fk_id = Column(Integer, ForeignKey("schedule.id"), nullable=True, index=True)
    schedule_display = Column(String, nullable=True)
    schedule = relationship("ScheduleModel", foreign_keys=[schedule_fk_id], lazy="selectin")

    # status (1..1 code)
    status = Column(Enum(SlotStatus, name="slot_status"), nullable=False)

    # start / end (1..1 instant)
    start = Column(DateTime(timezone=True), nullable=True)
    end = Column(DateTime(timezone=True), nullable=True)

    # appointmentType (0..1 CodeableConcept)
    appointment_type_system = Column(String, nullable=True)
    appointment_type_code = Column(String, nullable=True)
    appointment_type_display = Column(String, nullable=True)
    appointment_type_text = Column(String, nullable=True)

    # overbooked (0..1 boolean)
    overbooked = Column(Boolean, nullable=True)

    # comment (0..1 string)
    comment = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)

    identifiers = relationship(
        "SlotIdentifier", back_populates="slot", cascade="all, delete-orphan"
    )
    service_categories = relationship(
        "SlotServiceCategory", back_populates="slot", cascade="all, delete-orphan"
    )
    service_types = relationship(
        "SlotServiceType", back_populates="slot", cascade="all, delete-orphan"
    )
    specialties = relationship(
        "SlotSpecialty", back_populates="slot", cascade="all, delete-orphan"
    )


# ---------------------------------------------------------------------------
# identifier[] — 0..*  (Identifier)
# ---------------------------------------------------------------------------

class SlotIdentifier(Base):
    __tablename__ = "slot_identifier"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slot_id = Column(Integer, ForeignKey("slot.id"), nullable=False, index=True)
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

    slot = relationship("SlotModel", back_populates="identifiers")


# ---------------------------------------------------------------------------
# serviceCategory[] — 0..*  (CodeableConcept)
# ---------------------------------------------------------------------------

class SlotServiceCategory(Base):
    __tablename__ = "slot_service_category"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slot_id = Column(Integer, ForeignKey("slot.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    slot = relationship("SlotModel", back_populates="service_categories")


# ---------------------------------------------------------------------------
# serviceType[] — 0..*  (CodeableConcept)
# ---------------------------------------------------------------------------

class SlotServiceType(Base):
    __tablename__ = "slot_service_type"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slot_id = Column(Integer, ForeignKey("slot.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    slot = relationship("SlotModel", back_populates="service_types")


# ---------------------------------------------------------------------------
# specialty[] — 0..*  (CodeableConcept)
# ---------------------------------------------------------------------------

class SlotSpecialty(Base):
    __tablename__ = "slot_specialty"

    id = Column(Integer, primary_key=True, autoincrement=True)
    slot_id = Column(Integer, ForeignKey("slot.id"), nullable=False, index=True)
    org_id = Column(String, nullable=True)

    coding_system = Column(String, nullable=True)
    coding_code = Column(String, nullable=True)
    coding_display = Column(String, nullable=True)
    text = Column(String, nullable=True)

    slot = relationship("SlotModel", back_populates="specialties")
