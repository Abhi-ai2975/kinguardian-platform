"""
Multimodal Wearable + Parent Check-in Correlation.

Synthesizes objective wearable telemetry with subjective parent self-reports
to produce contextual care insights rather than medical diagnoses.

Scenario:
Wearable:
  activity lower than baseline
Parent:
  "Feeling okay"
KinGuardian Multimodal Correlation:
  No urgent signal.
  Continue monitoring.
  -> Produces a contextual insight rather than a diagnosis.
"""

from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid


@dataclass(frozen=True)
class MultimodalCorrelationAssessment:
    """
    Contextual synthesis of wearable biometrics and parent self-reports.
    GUARANTEE: Produces contextual insights rather than medical diagnoses.
    """
    id: uuid.UUID
    subject_id: uuid.UUID
    subject_name: str
    headline: str
    narrative: str
    is_urgent: bool                     # False for "No urgent signal"
    is_diagnosis: bool                  # False (strictly non-diagnostic)
    insight_type: str                   # "contextual_insight"
    wearable_finding: str               # "Activity lower than baseline"
    parent_checkin_status: str          # "Feeling okay"
    recommended_action: str             # "Continue monitoring."
    severity: str = "info"              # "info" | "normal" | "monitoring"
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "subject_id": str(self.subject_id),
            "subject_name": self.subject_name,
            "headline": self.headline,
            "narrative": self.narrative,
            "is_urgent": self.is_urgent,
            "is_diagnosis": self.is_diagnosis,
            "insight_type": self.insight_type,
            "wearable_finding": self.wearable_finding,
            "parent_checkin_status": self.parent_checkin_status,
            "recommended_action": self.recommended_action,
            "severity": self.severity,
            "created_at": self.created_at.isoformat()
        }


class MultimodalWearableCheckinCorrelator:
    """
    Multimodal engine correlating wearable telemetry with parent check-in responses.
    """

    @classmethod
    def correlate(
        cls,
        subject_id: uuid.UUID,
        subject_name: str = "Dad",
        activity_lower_than_baseline: bool = True,
        parent_checkin_text: str = "Feeling okay",
        steps_today: Optional[int] = 5430,
        baseline_steps: Optional[int] = 6210
    ) -> MultimodalCorrelationAssessment:
        """
        Synthesizes wearable activity status with parent check-in.
        """
        checkin_normalized = parent_checkin_text.strip().lower()
        is_positive_or_neutral = any(
            phrase in checkin_normalized
            for phrase in ("feeling okay", "okay", "ok", "fine", "feeling good", "doing well", "good")
        )

        if activity_lower_than_baseline and is_positive_or_neutral:
            headline = f"{subject_name}'s activity is lower than usual, but reported feeling okay."
            narrative = (
                f"Wearable tracking shows activity below baseline ({steps_today} steps vs usual {baseline_steps} steps). "
                f"However, {subject_name}'s check-in response was '{parent_checkin_text}'. "
                f"No urgent signal. Continue monitoring."
            )

            return MultimodalCorrelationAssessment(
                id=uuid.uuid4(),
                subject_id=subject_id,
                subject_name=subject_name,
                headline=headline,
                narrative=narrative,
                is_urgent=False,
                is_diagnosis=False,
                insight_type="contextual_insight",
                wearable_finding="activity lower than baseline",
                parent_checkin_status=parent_checkin_text,
                recommended_action="Continue monitoring.",
                severity="info"
            )

        # Fallback contextual assessment
        return MultimodalCorrelationAssessment(
            id=uuid.uuid4(),
            subject_id=subject_id,
            subject_name=subject_name,
            headline=f"{subject_name}'s daily check-in and wearable update.",
            narrative=f"Wearable data and check-in '{parent_checkin_text}' recorded. Continue regular monitoring.",
            is_urgent=False,
            is_diagnosis=False,
            insight_type="contextual_insight",
            wearable_finding="activity normal" if not activity_lower_than_baseline else "activity lower than baseline",
            parent_checkin_status=parent_checkin_text,
            recommended_action="Continue monitoring.",
            severity="info"
        )
