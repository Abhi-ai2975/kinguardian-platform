import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field



class VitalSign(BaseModel):
    code: str
    display: str
    value: float
    unit: str
    recorded_at: datetime


class VitalsSummaryResponse(BaseModel):
    patient_id: str
    vitals: List[VitalSign] = []


class AppointmentSummaryResponse(BaseModel):
    appointment_id: str
    status: str
    start_time: datetime
    end_time: datetime
    description: Optional[str] = None
    practitioner_name: Optional[str] = None


class MedicationSummaryResponse(BaseModel):
    medication_id: str
    name: str
    status: str
    dosage_instruction: Optional[str] = None
    prescribed_date: datetime
    practitioner_name: Optional[str] = None


class MedicationReminderResponse(BaseModel):
    status: str
    subject_id: uuid.UUID
    medication_id: str
    medication_name: str
    reminded_at: datetime


class AppointmentDetailResponse(BaseModel):
    id: Optional[uuid.UUID] = None
    fhir_appointment_id: str
    family_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    status: str = "booked"
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    description: Optional[str] = None
    practitioner_name: Optional[str] = None
    assigned_caregiver_profile_id: Optional[uuid.UUID] = None
    preparation_status: str = "pending"
    summary_status: str = "pending"
    reminder_status: str = "pending"
    preparation_notes: Optional[str] = None
    visit_summary: Optional[str] = None


