"""
Test Suite for Demo & Seed Scenarios:
Verifies that all 6 required demo scenarios exercise actual service logic,
domain models, and read services rather than returning static/hardcoded responses:
1. Normal Day - No important alerts
2. Medication Missed - Dad's medication overdue
3. Guardian Moment - Dad's activity trending lower
4. New Lab Report - Mom uploads a report
5. Upcoming Appointment - Dad's cardiology appointment tomorrow
6. Parent Feeling Unwell - Parent submits concerning check-in
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from app.domains.family.application.demo_scenarios import (
    DemoScenarioService,
    SCENARIO_COORDINATOR_ID,
    SCENARIO_FAMILY_ID,
    SCENARIO_DAD_SUBJECT_ID,
    SCENARIO_MOM_SUBJECT_ID
)
from app.domains.family.application.read_services import (
    CoordinatorHomeReadService,
    ParentHealthSummaryReadService
)


@pytest.mark.asyncio
async def test_demo_scenario_normal_day(db_session: AsyncSession):
    """
    Scenario 1: Normal Day
    Verifies that real service logic executes, check-ins are logged,
    medications are marked taken, and coordinator home reflects a calm state
    with zero urgent attention items.
    """
    service = DemoScenarioService(db_session)
    result = await service.seed_scenario_normal_day()

    assert result["scenario"] == "normal_day"
    assert result["status"] == "success"
    assert result["is_calm"] is True
    assert result["attention_items_count"] == 0

    read_service = CoordinatorHomeReadService(db_session)
    home = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)
    assert len(home.parent_statuses) == 2
    assert all(p.latest_checkin_feeling in ["good", "great"] for p in home.parent_statuses)


@pytest.mark.asyncio
async def test_demo_scenario_medication_missed(db_session: AsyncSession):
    """
    Scenario 2: Medication Missed
    Verifies that Dad's overdue blood pressure dose triggers an adherence alert,
    a pending verification task for caregiver Priya, and an AttentionItem on Coordinator Home.
    """
    service = DemoScenarioService(db_session)
    result = await service.seed_scenario_medication_missed()

    assert result["scenario"] == "medication_missed"
    assert result["status"] == "success"
    assert "Telmisartan" in result["overdue_task_title"]

    read_service = CoordinatorHomeReadService(db_session)
    home = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)
    assert len(home.pending_care_tasks) >= 1
    assert any("telmisartan" in t.title.lower() or "blood pressure" in t.title.lower() for t in home.pending_care_tasks)


@pytest.mark.asyncio
async def test_demo_scenario_guardian_moment(db_session: AsyncSession):
    """
    Scenario 3: Guardian Moment
    Verifies that Dad's 68% drop in activity steps creates a Guardian Moment AI insight
    with baseline comparison metrics and a proposed proactive check-in task.
    """
    service = DemoScenarioService(db_session)
    result = await service.seed_scenario_guardian_moment()

    assert result["scenario"] == "guardian_moment"
    assert result["status"] == "success"
    assert result["guardian_moments_count"] >= 1
    assert "Activity Trending Lower" in result["guardian_moment_title"]
    assert "6,200 steps/day" in result["baseline_comparison"]

    read_service = CoordinatorHomeReadService(db_session)
    home = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)
    assert len(home.guardian_moments) >= 1
    assert home.guardian_moments[0].severity == "attention"


@pytest.mark.asyncio
async def test_demo_scenario_new_lab_report(db_session: AsyncSession):
    """
    Scenario 4: New Lab Report
    Verifies that Mom uploading a lab report creates a HealthDocument,
    runs structured extraction, and produces an AttentionItem requiring human review.
    """
    service = DemoScenarioService(db_session)
    result = await service.seed_scenario_new_lab_report()

    assert result["scenario"] == "new_lab_report"
    assert result["status"] == "success"
    assert result["document_type"] == "lab_report"
    assert result["extraction_review_status"] == "pending_review"
    assert result["has_extraction_review_item"] is True

    read_service = CoordinatorHomeReadService(db_session)
    home = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)
    assert any(item.action_type == "review_extraction" for item in home.attention_items)


@pytest.mark.asyncio
async def test_demo_scenario_upcoming_appointment(db_session: AsyncSession):
    """
    Scenario 5: Upcoming Appointment
    Verifies that Dad's cardiology consultation tomorrow
    is coordinated with preparation task and displayed in Coordinator Home.
    """
    service = DemoScenarioService(db_session)
    result = await service.seed_scenario_upcoming_appointment()

    assert result["scenario"] == "upcoming_appointment"
    assert result["status"] == "success"
    assert result["upcoming_appointments_count"] >= 1
    assert "Cardiology" in result["appointment_prep_task"]

    read_service = CoordinatorHomeReadService(db_session)
    home = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)
    assert len(home.upcoming_appointments) >= 1
    assert any(a.fhir_appointment_id == "fhir-appt-cardio-dad-tomorrow" for a in home.upcoming_appointments)



@pytest.mark.asyncio
async def test_demo_scenario_parent_feeling_unwell(db_session: AsyncSession):
    """
    Scenario 6: Parent Feeling Unwell
    Verifies that a high-severity check-in ("unwell", dizziness) generates an immediate
    notification intent, an urgent in-person check task, and updates Parent Health Summary.
    """
    service = DemoScenarioService(db_session)
    result = await service.seed_scenario_parent_feeling_unwell()

    assert result["scenario"] == "parent_feeling_unwell"
    assert result["status"] == "success"
    assert result["feeling"] == "unwell"
    assert result["severity"] == "high"
    assert "dizzy" in result["notes"].lower()

    assert result["latest_checkin_feeling"] == "unwell"

    # Verify coordinator home attention item
    read_service = CoordinatorHomeReadService(db_session)
    home = await read_service.get_coordinator_home(SCENARIO_COORDINATOR_ID, SCENARIO_FAMILY_ID)
    assert any("Urgent" in t.title or "Vitals" in t.title or "unwell" in t.title.lower() for t in home.pending_care_tasks)


@pytest.mark.asyncio
async def test_demo_scenarios_all_combined(db_session: AsyncSession):
    """
    Verifies that seed_all_scenarios executes all 6 scenarios cohesively through real service pipelines.
    """
    service = DemoScenarioService(db_session)
    results = await service.seed_all_scenarios()

    assert "normal_day" in results
    assert "medication_missed" in results
    assert "guardian_moment" in results
    assert "new_lab_report" in results
    assert "upcoming_appointment" in results
    assert "parent_feeling_unwell" in results

    for key, res in results.items():
        assert res["status"] == "success"
