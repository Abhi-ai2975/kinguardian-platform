from datetime import date as _Date
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class VitalsCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "pseudo_id": "user_12345",
                "pseudo_id2": "device_fitbit_67890",
                "steps": 8542,
                "calories_kcal": 2150.5,
                "distance_meters": 5200.0,
                "total_active_minutes": 45,
                "activity_name": "WALKING",
                "exercise_duration_minutes": 45.5,
                "resting_heart_rate": 72,
                "heart_rate": 72,
                "sleep_minutes": 480,
                "weight_kg": 70.0,
                "height_cm": 175.0,
                "recorded_at": "2026-05-02T18:03:00",
                "date": "2026-05-02",
            }
        },
    )

    # Identity
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None
    pseudo_id: Optional[str] = None
    pseudo_id2: Optional[str] = None
    patient_id: Optional[int] = Field(None, description="Public patient_id.")

    # Core Activity
    steps: Optional[int] = Field(None, ge=0, le=100_000)
    calories_kcal: Optional[float] = Field(None, ge=0, le=10_000)
    distance_meters: Optional[float] = Field(None, ge=0, le=200_000)
    total_active_minutes: Optional[int] = Field(None, ge=0, le=1_440)

    # Exercise
    activity_name: Optional[str] = None
    exercise_duration_minutes: Optional[float] = Field(None, ge=0, le=1_440)
    active_zone_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    fatburn_active_zone_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    cardio_active_zone_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    peak_active_zone_minutes: Optional[int] = Field(None, ge=0, le=1_440)

    # Vitals
    resting_heart_rate: Optional[int] = Field(None, ge=20, le=250)
    heart_rate: Optional[int] = Field(None, ge=20, le=300)
    heart_rate_variability: Optional[float] = Field(None, ge=0, le=200)
    stress_management_score: Optional[int] = Field(None, ge=0, le=100)
    blood_pressure_systolic: Optional[int] = Field(None, ge=60, le=300)
    blood_pressure_diastolic: Optional[int] = Field(None, ge=40, le=200)

    # Sleep
    sleep_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    rem_sleep_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    deep_sleep_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    light_sleep_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    awake_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    bed_time: Optional[str] = None
    wake_up_time: Optional[str] = None
    deep_sleep_percent: Optional[float] = Field(None, ge=0, le=100)
    rem_sleep_percent: Optional[float] = Field(None, ge=0, le=100)
    light_sleep_percent: Optional[float] = Field(None, ge=0, le=100)
    awake_percent: Optional[float] = Field(None, ge=0, le=100)

    # Biometrics
    weight_kg: Optional[float] = Field(None, ge=1, le=500)
    height_cm: Optional[float] = Field(None, ge=30, le=300)
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = None

    # Metadata
    recorded_at: Optional[datetime] = None
    date: Optional[_Date] = None


class VitalsPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # Identity
    pseudo_id: Optional[str] = None
    pseudo_id2: Optional[str] = None
    patient_id: Optional[int] = None

    # Core Activity
    steps: Optional[int] = Field(None, ge=0, le=100_000)
    calories_kcal: Optional[float] = Field(None, ge=0, le=10_000)
    distance_meters: Optional[float] = Field(None, ge=0, le=200_000)
    total_active_minutes: Optional[int] = Field(None, ge=0, le=1_440)

    # Exercise
    activity_name: Optional[str] = None
    exercise_duration_minutes: Optional[float] = Field(None, ge=0, le=1_440)
    active_zone_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    fatburn_active_zone_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    cardio_active_zone_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    peak_active_zone_minutes: Optional[int] = Field(None, ge=0, le=1_440)

    # Vitals
    resting_heart_rate: Optional[int] = Field(None, ge=20, le=250)
    heart_rate: Optional[int] = Field(None, ge=20, le=300)
    heart_rate_variability: Optional[float] = Field(None, ge=0, le=200)
    stress_management_score: Optional[int] = Field(None, ge=0, le=100)
    blood_pressure_systolic: Optional[int] = Field(None, ge=60, le=300)
    blood_pressure_diastolic: Optional[int] = Field(None, ge=40, le=200)

    # Sleep
    sleep_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    rem_sleep_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    deep_sleep_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    light_sleep_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    awake_minutes: Optional[int] = Field(None, ge=0, le=1_440)
    bed_time: Optional[str] = None
    wake_up_time: Optional[str] = None
    deep_sleep_percent: Optional[float] = Field(None, ge=0, le=100)
    rem_sleep_percent: Optional[float] = Field(None, ge=0, le=100)
    light_sleep_percent: Optional[float] = Field(None, ge=0, le=100)
    awake_percent: Optional[float] = Field(None, ge=0, le=100)

    # Biometrics
    weight_kg: Optional[float] = Field(None, ge=1, le=500)
    height_cm: Optional[float] = Field(None, ge=30, le=300)
    age: Optional[int] = Field(None, ge=0, le=150)
    gender: Optional[str] = None

    # Metadata — recorded_at is immutable after creation
    date: Optional[_Date] = None
    updated_by: Optional[str] = None
