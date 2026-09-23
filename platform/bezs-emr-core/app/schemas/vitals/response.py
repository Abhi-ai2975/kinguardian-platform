from datetime import date as _Date
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class VitalsResponseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: int = Field(..., description="Public vitals identifier.")

    # Identity
    pseudo_id: Optional[str] = None
    pseudo_id2: Optional[str] = None
    user_id: Optional[str] = None
    patient_id: Optional[int] = None
    org_id: Optional[str] = None

    # Core Activity
    steps: Optional[int] = None
    calories_kcal: Optional[float] = None
    distance_meters: Optional[float] = None
    total_active_minutes: Optional[int] = None

    # Exercise
    activity_name: Optional[str] = None
    exercise_duration_minutes: Optional[float] = None
    active_zone_minutes: Optional[int] = None
    fatburn_active_zone_minutes: Optional[int] = None
    cardio_active_zone_minutes: Optional[int] = None
    peak_active_zone_minutes: Optional[int] = None

    # Vitals
    resting_heart_rate: Optional[int] = None
    heart_rate: Optional[int] = None
    heart_rate_variability: Optional[float] = None
    stress_management_score: Optional[int] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None

    # Sleep
    sleep_minutes: Optional[int] = None
    rem_sleep_minutes: Optional[int] = None
    deep_sleep_minutes: Optional[int] = None
    light_sleep_minutes: Optional[int] = None
    awake_minutes: Optional[int] = None
    bed_time: Optional[str] = None
    wake_up_time: Optional[str] = None
    deep_sleep_percent: Optional[float] = None
    rem_sleep_percent: Optional[float] = None
    light_sleep_percent: Optional[float] = None
    awake_percent: Optional[float] = None

    # Biometrics
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None

    # Metadata
    recorded_at: Optional[datetime] = None
    date: Optional[_Date] = None

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class PaginatedVitalsResponse(BaseModel):
    total: int = Field(..., description="Total number of matching vitals entries.")
    limit: int = Field(..., description="Page size requested.")
    offset: int = Field(..., description="Number of records skipped.")
    data: List[VitalsResponseSchema] = Field(..., description="Array of vitals entries.")
