from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.episode_of_care.enums import EpisodeOfCareStatus


class EpisodeOfCareIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class EpisodeOfCareStatusHistoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class EpisodeOfCareTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class EpisodeOfCareDiagnosisInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    condition: Optional[str] = Field(None, description="Condition reference, e.g. 'Condition/120001'.")
    condition_display: Optional[str] = None
    role_system: Optional[str] = None
    role_code: Optional[str] = None
    role_display: Optional[str] = None
    role_text: Optional[str] = None
    rank: Optional[int] = None


class EpisodeOfCareReferralRequestInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference: Optional[str] = Field(None, description="ServiceRequest reference, e.g. 'ServiceRequest/80001'.")
    reference_display: Optional[str] = None


class EpisodeOfCareTeamInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference: Optional[str] = Field(None, description="CareTeam reference, e.g. 'CareTeam/1'.")
    reference_display: Optional[str] = None


class EpisodeOfCareAccountInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference: Optional[str] = Field(None, description="Account reference, e.g. 'Account/1'.")
    reference_display: Optional[str] = None


class EpisodeOfCareCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    status: EpisodeOfCareStatus

    patient: Optional[str] = Field(None, description="Patient reference, e.g. 'Patient/10001'.")
    patient_display: Optional[str] = None

    managing_organization: Optional[str] = Field(
        None, description="Organization reference, e.g. 'Organization/190001'."
    )
    managing_organization_display: Optional[str] = None

    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

    care_manager: Optional[str] = Field(
        None, description="Practitioner or PractitionerRole reference, e.g. 'Practitioner/30001'."
    )
    care_manager_display: Optional[str] = None

    identifiers: Optional[List[EpisodeOfCareIdentifierInput]] = None
    status_history: Optional[List[EpisodeOfCareStatusHistoryInput]] = None
    types: Optional[List[EpisodeOfCareTypeInput]] = None
    diagnoses: Optional[List[EpisodeOfCareDiagnosisInput]] = None
    referral_requests: Optional[List[EpisodeOfCareReferralRequestInput]] = None
    team: Optional[List[EpisodeOfCareTeamInput]] = None
    accounts: Optional[List[EpisodeOfCareAccountInput]] = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "status": "active",
                "patient": "Patient/10001",
                "patient_display": "John Doe",
                "managing_organization": "Organization/190001",
                "managing_organization_display": "General Hospital",
                "period_start": "2024-01-01T00:00:00Z",
                "period_end": None,
                "care_manager": "Practitioner/30001",
                "care_manager_display": "Dr. Smith",
                "identifiers": [{"system": "http://example.org/eoc", "value": "EOC-001"}],
                "status_history": [{"status": "planned", "period_start": "2024-01-01T00:00:00Z"}],
                "types": [{"coding_system": "http://snomed.info/sct", "coding_code": "394602003"}],
                "diagnoses": [{"condition": "Condition/120001", "rank": 1}],
                "referral_requests": [{"reference": "ServiceRequest/80001"}],
                "team": [],
                "accounts": [],
            }
        },
    )


class EpisodeOfCarePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[EpisodeOfCareStatus] = None

    patient: Optional[str] = Field(None, description="Patient reference, e.g. 'Patient/10001'.")
    patient_display: Optional[str] = None

    managing_organization: Optional[str] = Field(
        None, description="Organization reference, e.g. 'Organization/190001'."
    )
    managing_organization_display: Optional[str] = None

    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None

    care_manager: Optional[str] = Field(
        None, description="Practitioner or PractitionerRole reference."
    )
    care_manager_display: Optional[str] = None

    identifiers: Optional[List[EpisodeOfCareIdentifierInput]] = None
    status_history: Optional[List[EpisodeOfCareStatusHistoryInput]] = None
    types: Optional[List[EpisodeOfCareTypeInput]] = None
    diagnoses: Optional[List[EpisodeOfCareDiagnosisInput]] = None
    referral_requests: Optional[List[EpisodeOfCareReferralRequestInput]] = None
    team: Optional[List[EpisodeOfCareTeamInput]] = None
    accounts: Optional[List[EpisodeOfCareAccountInput]] = None
    updated_by: Optional[str] = None
