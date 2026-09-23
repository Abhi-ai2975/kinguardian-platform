import pytest
import uuid
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.clinical.gateway import ClinicalRecordGateway
from app.domains.clinical.analytics import (
    HealthMetricSnapshot,
    MetricSeriesResponse,
    HealthAnalyticsService
)


class MockClinicalRecordGateway:
    """Mock gateway returning mock FHIR R4 observations."""
    def __init__(self, observations=None):
        self.observations = observations or []
        self.call_count = 0

    async def get_patient(self, fhir_patient_id: str, auth_token=None):
        return {"id": fhir_patient_id, "resourceType": "Patient"}

    async def get_observations(self, fhir_patient_id: str, category=None, auth_token=None):
        self.call_count += 1
        return self.observations

    async def get_conditions(self, fhir_patient_id: str, clinical_status="active", auth_token=None):
        return []

    async def get_medications(self, fhir_patient_id: str, status="active", auth_token=None):
        return []

    async def get_medication_by_id(self, fhir_medication_id: str, auth_token=None):
        return None

    async def get_appointments(self, fhir_patient_id: str, status=None, auth_token=None):
        return []

    async def get_appointment_by_id(self, fhir_appointment_id: str, auth_token=None):
        return None

    async def get_encounters(self, fhir_patient_id: str, status=None, auth_token=None):
        return []

    async def get_diagnostic_reports(self, fhir_patient_id: str, category=None, auth_token=None):
        return []

    async def get_document_references(self, fhir_patient_id: str, doc_type=None, auth_token=None):
        return []

    async def get_service_requests(self, fhir_patient_id: str, status="active", auth_token=None):
        return []


@pytest.mark.asyncio
async def test_health_analytics_read_layer_normalizes_and_derives_baselines():
    """
    Verifies on-demand derivation of HealthMetricSnapshot from FHIR source without redundant DB storage.
    """
    now = datetime.now()
    subject_id = uuid.uuid4()
    fhir_patient_id = "pat-analytics-001"

    # Seed 10 FHIR Observations
    mock_obs = [
        {
            "id": f"obs-{i}",
            "code": "85354-9",
            "value": f"{120 + i}/80",
            "unit": "mmHg",
            "date": (now - timedelta(days=10 - i)).isoformat()
        }
        for i in range(10)
    ]

    mock_gateway = MockClinicalRecordGateway(mock_obs)
    analytics_svc = HealthAnalyticsService(gateway=mock_gateway, cache_ttl_seconds=60)

    # 1. Fetch snapshots
    snapshots = await analytics_svc.get_patient_metric_snapshots(
        fhir_patient_id=fhir_patient_id,
        subject_id=subject_id,
        metric="blood_pressure_systolic",
        timeframe_days=30
    )

    assert len(snapshots) == 10
    assert mock_gateway.call_count == 1

    first = snapshots[0]
    assert isinstance(first, HealthMetricSnapshot)
    assert first.metric == "blood_pressure_systolic"
    assert first.unit == "mmHg"
    assert first.value == 120.0
    assert first.baseline_value is not None
    assert first.baseline_value == pytest.approx(124.5, 0.5)

    # 2. Test In-Memory Cache (should not increment call_count)
    snapshots_cached = await analytics_svc.get_patient_metric_snapshots(
        fhir_patient_id=fhir_patient_id,
        subject_id=subject_id,
        metric="blood_pressure_systolic",
        timeframe_days=30
    )
    assert len(snapshots_cached) == 10
    assert mock_gateway.call_count == 1  # Served from cache

    # 3. Test Multi-Window Baselines
    series_resp = await analytics_svc.get_metric_series_with_baselines(
        fhir_patient_id=fhir_patient_id,
        subject_id=subject_id,
        metric="blood_pressure_systolic"
    )
    assert series_resp.metric == "blood_pressure_systolic"
    assert len(series_resp.data_points) == 10
    assert series_resp.baseline_7d is not None
    assert series_resp.baseline_14d is not None
    assert series_resp.baseline_30d is not None


@pytest.mark.asyncio
async def test_health_analytics_rest_endpoints(db_session):
    """
    Verifies REST API endpoints for on-demand metric snapshots and baseline series.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_analytics_rest",
        email="coord_analytics@kinguardian.com",
        display_name="Maya Analytics",
        timezone="America/New_York"
    )
    family = await family_svc.create_care_circle(coordinator.id, "Analytics Circle", "coordinator")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-rest-analytics",
        relationship_to_coordinator="mother"
    )

    app_profile = await db_session.get(AppProfile, coordinator.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. GET /api/v1/clinical/analytics/subjects/{id}/snapshots
            resp_snap = await client.get(f"/api/v1/clinical/analytics/subjects/{subject.id}/snapshots")
            assert resp_snap.status_code == 200
            assert isinstance(resp_snap.json(), list)

            # 2. GET /api/v1/clinical/analytics/subjects/{id}/series/blood_pressure_systolic
            resp_series = await client.get(f"/api/v1/clinical/analytics/subjects/{subject.id}/series/blood_pressure_systolic")
            assert resp_series.status_code == 200
            data = resp_series.json()
            assert data["metric"] == "blood_pressure_systolic"
            assert "data_points" in data
    finally:
        app.dependency_overrides.clear()
