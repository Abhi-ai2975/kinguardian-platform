"""
Wearable + Clinical Data Correlation Test Suite.

Verifies:
1. Multi-signal correlation across 4 distinct dimensions:
   - Wearable activity ↓
   - Weight ↑
   - Blood pressure ↑
   - Medication adherence ↓
2. Surfacing of a comprehensive trend to the care coordinator.
3. Strict Clinical Boundary Invariant:
   - AI interpretation must remain separate from clinical decision-making.
   - The AI does NOT create diagnostic labels or modify treatments.
"""

import uuid
import pytest

from app.domains.wearables.domain.clinical_correlation import (
    ClinicalCorrelationContext,
    ClinicalCorrelationTrend,
    WearableClinicalCorrelationEngine
)


def test_four_signal_clinical_correlation_surfaced_to_coordinator():
    """
    Scenario directly from user request:
    Wearable activity ↓ + Weight ↑ + Blood pressure ↑ + Medication adherence ↓
    -> System surfaces a trend to the coordinator.
    -> AI interpretation remains strictly separate from clinical decision-making.
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    ctx = ClinicalCorrelationContext(
        subject_id=subject_id,
        family_id=family_id,
        subject_name="Dad",
        # Signal 1: Wearable Activity ↓
        activity_steps_today=3100,
        activity_baseline_steps=6200,
        activity_trend="below",
        # Signal 2: Weight ↑
        weight_current_kg=78.5,
        weight_baseline_kg=76.0,
        weight_trend="above",
        # Signal 3: Blood Pressure ↑
        systolic_bp=148,
        diastolic_bp=92,
        bp_baseline_systolic=125,
        bp_trend="above",
        # Signal 4: Medication Adherence ↓
        medication_adherence_status="below",
        missed_medications=["Torsemide (Diuretic)", "Amlodipine"],
        attending_physician="Dr. V. Rao"
    )

    trend: ClinicalCorrelationTrend = WearableClinicalCorrelationEngine.correlate(ctx)

    # 1. Verification of Surfaced Trend to Coordinator
    assert "Multi-Signal Correlation Trend for Dad" in trend.title
    assert "decreased activity, weight gain, elevated blood pressure, and missed medications" in trend.headline
    assert len(trend.contributing_signals) == 4

    # 2. Contributing signal directions
    signals_by_name = {s["signal"]: s for s in trend.contributing_signals}
    assert signals_by_name["wearable_activity"]["direction"] == "down"
    assert signals_by_name["weight"]["direction"] == "up"
    assert signals_by_name["blood_pressure"]["direction"] == "up"
    assert signals_by_name["medication_adherence"]["direction"] == "down"

    # 3. CRITICAL CLINICAL SAFETY INVARIANT: AI interpretation != Clinical decision-making
    assert trend.is_clinical_diagnosis is False
    assert "AI pattern detection only" in trend.clinical_decision_separation_notice
    assert "strictly reserved for healthcare professionals" in trend.clinical_decision_separation_notice

    # 4. Actionable Next Steps (Empowers Doctor Consultation rather than Autonomous Medical Action)
    assert "Prepare doctor summary" in trend.suggested_coordinator_actions
    assert "Share trend report with Dr. V. Rao" in trend.suggested_coordinator_actions
    assert "Check in with Dad" in trend.suggested_coordinator_actions


def test_standard_signals_do_not_trigger_clinical_warning():
    """
    Verifies that when metrics are normal, standard overview is returned.
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    ctx = ClinicalCorrelationContext(
        subject_id=subject_id,
        family_id=family_id,
        subject_name="Dad",
        activity_steps_today=6100,
        activity_baseline_steps=6200,
        activity_trend="normal",
        weight_current_kg=76.2,
        weight_baseline_kg=76.0,
        weight_trend="normal",
        systolic_bp=124,
        diastolic_bp=80,
        bp_baseline_systolic=125,
        bp_trend="normal",
        medication_adherence_status="normal",
        missed_medications=[]
    )

    trend: ClinicalCorrelationTrend = WearableClinicalCorrelationEngine.correlate(ctx)
    assert trend.severity == "normal"
    assert trend.is_clinical_diagnosis is False
    assert "Health signals for Dad remain within expected parameters." in trend.headline
