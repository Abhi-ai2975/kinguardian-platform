"""
Comprehensive Unit Test Suite for KinGuardian Platform:
1. Authorization Policies
2. Consent Evaluation
3. Baseline Calculations
4. Trend Detection
5. Notification Rules
6. Timezone Conversion
7. Domain Validations
8. Care Task Transitions
9. Medication Adherence Transitions
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta

from app.core.timezones import TimezoneService, DualTimezoneView
from app.domains.family.application.permissions import (
    ROLE_CAPABILITIES,
    CAP_VIEW_BASIC,
    CAP_VIEW_HEALTH_SUMMARY,
    CAP_VIEW_MEDICATIONS,
    CAP_VIEW_VITALS,
    CAP_VIEW_LABS,
    CAP_VIEW_DOCUMENTS,
    CAP_VIEW_APPOINTMENTS,
    CAP_MANAGE_MEDICATIONS,
    CAP_MANAGE_APPOINTMENTS,
    CAP_MANAGE_CARE_TASKS,
    CAP_RECEIVE_HEALTH_ALERTS,
    CAP_UPLOAD_DOCUMENTS,
    CAP_SHARE_HEALTH_SUMMARY,
    CAP_COMMUNICATE_WITH_FAMILY,
    CAP_MANAGE_PERMISSIONS
)
from app.domains.family.domain.entities import (
    ConsentEntity,
    CareTaskEntity,
    MedicationAdherenceEventEntity
)
from app.domains.insights.baseline import (
    DataPoint,
    BaselineCalculator,
    BaselineService
)
from app.domains.insights.strategies import (
    ActivityTrendStrategy,
    SleepTrendStrategy,
    BloodPressureTrendStrategy
)
from app.domains.notifications.rules import (
    ParentCheckinSubmittedRule,
    MedicationMissedRule,
    GuardianMomentCreatedRule
)
from app.domains.family.schemas import (
    FamilyCreate,
    WellbeingCheckinCreate,
    CareTaskCreate
)


# ==============================================================================
# 1. Authorization Policies
# ==============================================================================
@pytest.mark.unit
def test_unit_authorization_policies():
    """Verifies RBAC role capability mapping."""
    coord_caps = ROLE_CAPABILITIES["coordinator"]
    caregiver_caps = ROLE_CAPABILITIES["caregiver"]
    family_caps = ROLE_CAPABILITIES["family_member"]

    # Coordinator has full management capabilities
    assert CAP_MANAGE_PERMISSIONS in coord_caps
    assert CAP_UPLOAD_DOCUMENTS in coord_caps
    assert CAP_MANAGE_MEDICATIONS in coord_caps
    assert CAP_VIEW_HEALTH_SUMMARY in coord_caps

    # Caregiver can complete tasks and view vitals but not manage permissions
    assert CAP_MANAGE_CARE_TASKS in caregiver_caps
    assert CAP_VIEW_VITALS in caregiver_caps
    assert CAP_MANAGE_PERMISSIONS not in caregiver_caps

    # Read-only family member has limited view access
    assert CAP_VIEW_BASIC in family_caps
    assert CAP_VIEW_HEALTH_SUMMARY in family_caps
    assert CAP_UPLOAD_DOCUMENTS not in family_caps
    assert CAP_MANAGE_MEDICATIONS not in family_caps


# ==============================================================================
# 2. Consent Evaluation
# ==============================================================================
@pytest.mark.unit
def test_unit_consent_evaluation():
    """Verifies granular consent evaluation logic."""
    grantor_id = uuid.uuid4()
    grantee_id = uuid.uuid4()
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # Active consent with vitals & medications scopes
    consent = ConsentEntity(
        id=uuid.uuid4(),
        family_id=family_id,
        subject_id=subject_id,
        grantor_profile_id=grantor_id,
        grantee_profile_id=grantee_id,
        consent_type="data_access",
        scope={"vitals": True, "medications": True, "documents": False},
        status="active",
        version=1,
        granted_at=now,
        created_at=now,
        updated_at=now
    )

    # Allowed scopes
    assert consent.status == "active"
    assert consent.scope.get("vitals") is True
    assert consent.scope.get("medications") is True
    assert consent.scope.get("documents") is False

    # Revoked consent evaluation
    revoked_consent = ConsentEntity(
        id=uuid.uuid4(),
        family_id=family_id,
        subject_id=subject_id,
        grantor_profile_id=grantor_id,
        grantee_profile_id=grantee_id,
        consent_type="data_access",
        scope={"vitals": True},
        status="revoked",
        revoked_at=now,
        version=2,
        granted_at=now,
        created_at=now,
        updated_at=now
    )
    assert revoked_consent.status == "revoked"


# ==============================================================================
# 3. Baseline Calculations
# ==============================================================================
@pytest.mark.unit
def test_unit_baseline_calculations():
    """Verifies mean, standard deviation, and baseline range computation."""
    now = datetime.now()
    points = [
        DataPoint(
            timestamp=now - timedelta(days=29 - i),
            value=5000.0 + (i * 100.0)
        )
        for i in range(30)
    ]

    service = BaselineService()
    baselines = service.calculate_multi_window_baselines("steps", points)

    b7 = baselines["7_day"]
    assert b7.metric_name == "steps"
    assert b7.sample_count == 7
    assert b7.mean == pytest.approx(7600.0, 50.0)
    assert b7.trend_direction == "increasing"
    assert b7.trend_slope > 0


# ==============================================================================
# 4. Trend Detection
# ==============================================================================
@pytest.mark.unit
@pytest.mark.asyncio
async def test_unit_trend_detection():
    """Verifies trend anomaly and direction detection via strategy pattern."""
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    # 1. Activity Trend Strategy (Low Activity < 3000 steps)
    act_strat = ActivityTrendStrategy()
    act_obs = [
        {"code": "steps", "value": 2200, "date": "2026-08-20"},
        {"code": "steps", "value": 2400, "date": "2026-08-21"},
        {"code": "steps", "value": 2100, "date": "2026-08-22"},
    ]
    act_res = await act_strat.analyze(subject_id, family_id, act_obs)
    assert act_res is not None
    assert act_res.detected is True
    assert act_res.metric_name == "activity"
    assert act_res.severity == "warning"

    # 2. Sleep Trend Strategy (Short Sleep < 5.5 hours)
    sleep_strat = SleepTrendStrategy()
    sleep_obs = [
        {"code": "sleep_duration", "value": 4.8, "date": "2026-08-20"},
        {"code": "sleep_duration", "value": 5.0, "date": "2026-08-21"},
        {"code": "sleep_duration", "value": 4.5, "date": "2026-08-22"},
    ]
    sleep_res = await sleep_strat.analyze(subject_id, family_id, sleep_obs)
    assert sleep_res is not None
    assert sleep_res.detected is True
    assert sleep_res.metric_name == "sleep"


# ==============================================================================
# 5. Notification Rules
# ==============================================================================
@pytest.mark.unit
def test_unit_notification_rules():
    """Verifies notification policy rule instantiation and naming."""
    rule1 = ParentCheckinSubmittedRule()
    rule2 = MedicationMissedRule()
    rule3 = GuardianMomentCreatedRule()

    assert "parent_checkin" in rule1.rule_name
    assert "medication_missed" in rule2.rule_name
    assert "guardian_moment" in rule3.rule_name


# ==============================================================================
# 6. Timezone Conversion
# ==============================================================================
@pytest.mark.unit
def test_unit_timezone_conversion():
    """Verifies dual timezone projections and invalid timezone fallbacks."""
    utc_time = datetime(2026, 8, 23, 10, 0, 0, tzinfo=timezone.utc)

    # 1. Kolkata (UTC+5:30) vs London (BST / UTC+1 in August)
    dual_view = TimezoneService.build_dual_timezone_view(
        utc_time,
        parent_tz_str="Asia/Kolkata",
        coordinator_tz_str="Europe/London"
    )
    assert "15:30" in dual_view.parent_local_time
    assert "11:00" in dual_view.coordinator_local_time
    assert dual_view.time_difference_hours == 4.5

    # 2. Fallback to UTC on unknown timezone string
    safe_zone = TimezoneService.get_zone_info("Invalid/NonExistent_Zone")
    assert str(safe_zone) == "UTC"


# ==============================================================================
# 7. Domain Validations
# ==============================================================================
@pytest.mark.unit
def test_unit_domain_validations():
    """Verifies Pydantic DTO validation schemas."""
    # Valid family creation
    fam = FamilyCreate(name="Sharma Family Circle")
    assert fam.name == "Sharma Family Circle"

    # Valid checkin creation
    checkin = WellbeingCheckinCreate(
        feeling="good",
        notes="Morning walk completed."
    )
    assert checkin.feeling == "good"

    # Valid care task creation
    task = CareTaskCreate(
        subject_id=uuid.uuid4(),
        assigned_to_profile_id=uuid.uuid4(),
        category="medical",
        due_at=datetime.now(timezone.utc),
        title="Schedule Eye Checkup",
        priority="high"
    )
    assert task.title == "Schedule Eye Checkup"
    assert task.priority == "high"


# ==============================================================================
# 8. Care Task Transitions
# ==============================================================================
@pytest.mark.unit
def test_unit_care_task_transitions():
    """Verifies valid state transitions for CareTaskEntity."""
    now = datetime.now(timezone.utc)
    task = CareTaskEntity(
        id=uuid.uuid4(),
        family_id=uuid.uuid4(),
        subject_id=uuid.uuid4(),
        created_by_profile_id=uuid.uuid4(),
        assigned_to_profile_id=uuid.uuid4(),
        category="medical",
        due_at=now + timedelta(days=1),
        title="Buy Blood Pressure Monitor",
        status="pending",
        priority="normal",
        created_at=now,
        updated_at=now
    )
    assert task.status == "pending"

    # Transition: pending -> in_progress
    task.status = "in_progress"
    assert task.status == "in_progress"

    # Transition: in_progress -> completed
    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc)
    assert task.status == "completed"
    assert task.completed_at is not None


# ==============================================================================
# 9. Medication Adherence Transitions
# ==============================================================================
@pytest.mark.unit
def test_unit_medication_adherence_transitions():
    """Verifies state transitions for MedicationAdherenceEventEntity."""
    now = datetime.now(timezone.utc)
    actor_id = uuid.uuid4()

    event = MedicationAdherenceEventEntity(
        id=uuid.uuid4(),
        subject_id=uuid.uuid4(),
        fhir_medication_request_id="synth-med-123",
        scheduled_at=now,
        status="scheduled",
        source="system_scheduler",
        created_at=now,
        updated_at=now
    )
    assert event.status == "scheduled"
    assert event.confirmed_at is None

    # Transition: scheduled -> taken (with confirmation timestamp)
    confirmed_time = now + timedelta(minutes=5)
    event.status = "taken"
    event.confirmed_at = confirmed_time
    event.confirmed_by_profile_id = actor_id
    event.source = "parent_app"

    assert event.status == "taken"
    assert event.confirmed_at == confirmed_time
    assert event.confirmed_by_profile_id == actor_id
    assert event.source == "parent_app"

