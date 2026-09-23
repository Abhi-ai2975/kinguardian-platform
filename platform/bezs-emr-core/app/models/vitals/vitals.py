from sqlalchemy import Column, Date, DateTime, Float, Integer, Sequence, String
from sqlalchemy.sql import func

from app.core.database import FHIRBase as Base

vitals_id_seq = Sequence("vitals_pub_seq", start=70000, increment=1, metadata=Base.metadata)


class VitalsModel(Base):
    __tablename__ = "vitals"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    vitals_id = Column(
        Integer,
        vitals_id_seq,
        server_default=vitals_id_seq.next_value(),
        unique=True,
        index=True,
        nullable=False,
    )

    # Identity
    pseudo_id = Column(String, nullable=True, index=True)
    pseudo_id2 = Column(String, nullable=True)
    user_id = Column(String, nullable=True, index=True)
    patient_id = Column(Integer, nullable=True, index=True)
    org_id = Column(String, nullable=True, index=True)

    # Core Activity
    steps = Column(Integer, nullable=True)
    calories_kcal = Column(Float, nullable=True)
    distance_meters = Column(Float, nullable=True)
    total_active_minutes = Column(Integer, nullable=True)

    # Exercise
    activity_name = Column(String, nullable=True)
    exercise_duration_minutes = Column(Float, nullable=True)
    active_zone_minutes = Column(Integer, nullable=True)
    fatburn_active_zone_minutes = Column(Integer, nullable=True)
    cardio_active_zone_minutes = Column(Integer, nullable=True)
    peak_active_zone_minutes = Column(Integer, nullable=True)

    # Vitals
    resting_heart_rate = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    heart_rate_variability = Column(Float, nullable=True)
    stress_management_score = Column(Integer, nullable=True)
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)

    # Sleep
    sleep_minutes = Column(Integer, nullable=True)
    rem_sleep_minutes = Column(Integer, nullable=True)
    deep_sleep_minutes = Column(Integer, nullable=True)
    light_sleep_minutes = Column(Integer, nullable=True)
    awake_minutes = Column(Integer, nullable=True)
    bed_time = Column(String, nullable=True)
    wake_up_time = Column(String, nullable=True)
    deep_sleep_percent = Column(Float, nullable=True)
    rem_sleep_percent = Column(Float, nullable=True)
    light_sleep_percent = Column(Float, nullable=True)
    awake_percent = Column(Float, nullable=True)

    # Biometrics
    weight_kg = Column(Float, nullable=True)
    height_cm = Column(Float, nullable=True)
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)

    # Metadata
    recorded_at = Column(DateTime(timezone=True), nullable=True)
    date = Column(Date, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(String, nullable=True)
    updated_by = Column(String, nullable=True)
