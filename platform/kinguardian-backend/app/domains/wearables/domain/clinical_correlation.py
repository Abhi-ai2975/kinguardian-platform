"""
Wearable + Clinical Data Correlation Domain Service.

Correlates cross-domain clinical and biometric signals:
- Wearable activity ↓
- Weight ↑
- Blood pressure ↑
- Medication adherence ↓

Surfaces holistic trends to the care coordinator while strictly preserving
the clinical boundary: AI interpretation must remain separate from clinical decision-making.
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid


@dataclass
class ClinicalCorrelationContext:
    """
    Multidimensional clinical and wearable snapshot for a care subject.
    """
    subject_id: uuid.UUID
    family_id: uuid.UUID
    subject_name: str = "Dad"

    # Signal 1: Wearable Activity
    activity_steps_today: int = 3100
    activity_baseline_steps: int = 6200
    activity_trend: str = "below"  # "below" | "normal" | "above"

    # Signal 2: Weight
    weight_current_kg: float = 78.5
    weight_baseline_kg: float = 76.0
    weight_trend: str = "above"    # "above" | "normal" | "below"

    # Signal 3: Blood Pressure
    systolic_bp: int = 148
    diastolic_bp: int = 92
    bp_baseline_systolic: int = 125
    bp_trend: str = "above"        # "above" | "normal" | "below"

    # Signal 4: Medication Adherence
    medication_adherence_status: str = "below"  # "below" | "missed" | "normal"
    missed_medications: List[str] = field(default_factory=lambda: ["Torsemide (Diuretic)", "Amlodipine"])

    attending_physician: str = "Dr. V. Rao"


@dataclass(frozen=True)
class ClinicalCorrelationTrend:
    """
    Surfaced multi-signal trend for care coordinators.
    
    SAFETY INVARIANT:
    AI interpretation must remain separate from clinical decision-making.
    No automatic diagnostic labels (e.g. CHF exacerbation) are attached by AI.
    """
    id: uuid.UUID
    subject_id: uuid.UUID
    family_id: uuid.UUID
    title: str
    headline: str
    trend_summary: str
    contributing_signals: List[Dict[str, Any]]
    is_clinical_diagnosis: bool = False
    clinical_decision_separation_notice: str = (
        "AI pattern detection only. Clinical evaluation, medical diagnosis, "
        "and treatment adjustments remain strictly reserved for healthcare professionals."
    )
    suggested_coordinator_actions: List[str] = field(
        default_factory=lambda: [
            "Prepare doctor summary",
            "Share trend report with physician",
            "Check in with Dad"
        ]
    )
    severity: str = "warning"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "subject_id": str(self.subject_id),
            "family_id": str(self.family_id),
            "title": self.title,
            "headline": self.headline,
            "trend_summary": self.trend_summary,
            "contributing_signals": self.contributing_signals,
            "is_clinical_diagnosis": self.is_clinical_diagnosis,
            "clinical_decision_separation_notice": self.clinical_decision_separation_notice,
            "suggested_coordinator_actions": self.suggested_coordinator_actions,
            "severity": self.severity,
            "created_at": self.created_at.isoformat()
        }


class WearableClinicalCorrelationEngine:
    """
    Surfaces correlated multi-signal trends across wearable telemetry,
    vital signs, body composition, and medication adherence.
    """

    @classmethod
    def correlate(cls, ctx: ClinicalCorrelationContext) -> ClinicalCorrelationTrend:
        """
        Executes cross-domain pattern evaluation for the 4-signal trend:
        Activity ↓ + Weight ↑ + Blood Pressure ↑ + Medication adherence ↓
        """
        is_activity_down = ctx.activity_trend == "below" or ctx.activity_steps_today < (ctx.activity_baseline_steps * 0.7)
        is_weight_up = ctx.weight_trend == "above" or (ctx.weight_current_kg - ctx.weight_baseline_kg) >= 1.5
        is_bp_up = ctx.bp_trend == "above" or ctx.systolic_bp >= 140
        is_adherence_down = ctx.medication_adherence_status in ("below", "missed", "delayed")

        contributing_signals = [
            {
                "signal": "wearable_activity",
                "label": "Activity",
                "direction": "down",
                "detail": f"{ctx.activity_steps_today:,} steps (baseline: {ctx.activity_baseline_steps:,})"
            },
            {
                "signal": "weight",
                "label": "Weight",
                "direction": "up",
                "detail": f"{ctx.weight_current_kg} kg (+{round(ctx.weight_current_kg - ctx.weight_baseline_kg, 1)} kg from baseline)"
            },
            {
                "signal": "blood_pressure",
                "label": "Blood Pressure",
                "direction": "up",
                "detail": f"{ctx.systolic_bp}/{ctx.diastolic_bp} mmHg (baseline: {ctx.bp_baseline_systolic} systolic)"
            },
            {
                "signal": "medication_adherence",
                "label": "Medication Adherence",
                "direction": "down",
                "detail": f"Missed scheduled doses: {', '.join(ctx.missed_medications) or 'None'}"
            }
        ]

        if is_activity_down and is_weight_up and is_bp_up and is_adherence_down:
            title = f"Multi-Signal Correlation Trend for {ctx.subject_name}"
            headline = (
                f"{ctx.subject_name} shows a 4-signal trend: decreased activity, "
                f"weight gain, elevated blood pressure, and missed medications."
            )
            summary = (
                f"KinGuardian identified concurrent changes across multiple health streams over recent days: "
                f"wearable activity decreased by {round((1 - ctx.activity_steps_today/ctx.activity_baseline_steps)*100)}%, "
                f"weight increased by {round(ctx.weight_current_kg - ctx.weight_baseline_kg, 1)} kg, "
                f"blood pressure rose to {ctx.systolic_bp}/{ctx.diastolic_bp} mmHg, and scheduled doses were missed. "
                f"This pattern is surfaced to the care coordinator to facilitate informed discussion with {ctx.attending_physician}."
            )

            return ClinicalCorrelationTrend(
                id=uuid.uuid4(),
                subject_id=ctx.subject_id,
                family_id=ctx.family_id,
                title=title,
                headline=headline,
                trend_summary=summary,
                contributing_signals=contributing_signals,
                is_clinical_diagnosis=False,  # Non-diagnostic invariant
                severity="warning",
                suggested_coordinator_actions=[
                    "Prepare doctor summary",
                    f"Share trend report with {ctx.attending_physician}",
                    f"Check in with {ctx.subject_name}"
                ]
            )

        # Standard Multi-Signal Overview
        return ClinicalCorrelationTrend(
            id=uuid.uuid4(),
            subject_id=ctx.subject_id,
            family_id=ctx.family_id,
            title=f"Health Signal Overview for {ctx.subject_name}",
            headline=f"Health signals for {ctx.subject_name} remain within expected parameters.",
            trend_summary="No concurrent multi-signal clinical deviations detected.",
            contributing_signals=contributing_signals,
            is_clinical_diagnosis=False,
            severity="normal",
            suggested_coordinator_actions=["View routine summary"]
        )
