"""
Wearable Source Priority & Conflict Policy Engine.

Enforces configurable multi-factor resolution policies across 4 pillars:
1. Metric (e.g. steps, sleep_duration, heart_rate, hrv, distance)
2. Provider Priority (e.g. Apple Health → Garmin → Fitbit)
3. Freshness (Timestamp recency and maximum age tolerance)
4. Confidence (Measurement confidence and device sensor precision)

CORE PRINCIPLE:
Do not hardcode source priorities globally.
Policies are fully configurable per-care subject, per-metric, and dynamically customizable.
"""

from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
import uuid

from app.domains.wearables.domain.entities import WearableMetric
from app.domains.wearables.domain.value_objects import DeviceProvider, WearableMetricType


@dataclass
class SourcePriorityRule:
    """
    Configurable resolution rule for a specific metric across provider priority,
    freshness tolerance, and confidence thresholds.
    """
    metric: str                                          # e.g. "steps", "sleep_duration", "heart_rate"
    provider_priority: List[str]                         # e.g. ["apple_health", "garmin", "fitbit"]
    freshness_max_age_seconds: int = 86400               # 24 hours max age for consideration
    freshness_weight: float = 0.20                       # Relative weight of recency vs rank [0.0 - 1.0]
    min_confidence: float = 0.50                         # Minimum confidence required [0.0 - 1.0]
    provider_confidence_defaults: Dict[str, float] = field(default_factory=lambda: {
        "garmin": 0.95,
        "oura": 0.95,
        "whoop": 0.92,
        "apple_health": 0.90,
        "fitbit": 0.85,
        "health_connect": 0.80,
        "unknown": 0.60
    })

    def get_provider_rank(self, provider_str: str) -> int:
        """Returns 0-indexed position in provider_priority (lower is higher priority)."""
        p_clean = provider_str.lower().strip()
        try:
            return self.provider_priority.index(p_clean)
        except ValueError:
            return 999  # Unlisted provider has lowest rank

    def calculate_candidate_score(
        self,
        provider_str: str,
        measured_at: Optional[datetime],
        confidence: Optional[float] = None,
        reference_time: Optional[datetime] = None
    ) -> float:
        """
        Calculates multi-factor score:
        Score = (Base Rank Points) * (1 - freshness_weight) + (Freshness Score) * freshness_weight + (Confidence Bonus)
        """
        ref_dt = reference_time or datetime.now(timezone.utc)
        p_clean = provider_str.lower().strip()

        # 1. Base Rank Score (Max 100 points for #1 priority, descending)
        rank = self.get_provider_rank(p_clean)
        if rank < len(self.provider_priority):
            rank_score = max(10.0, 100.0 - (rank * 25.0))
        else:
            rank_score = 5.0

        # 2. Freshness Score (0 to 100 points based on age vs max age)
        freshness_score = 100.0
        if measured_at:
            m_dt = measured_at if measured_at.tzinfo is not None else measured_at.replace(tzinfo=timezone.utc)
            age_secs = max(0.0, (ref_dt - m_dt).total_seconds())
            if age_secs > self.freshness_max_age_seconds:
                freshness_score = 0.0
            else:
                freshness_score = max(0.0, 100.0 * (1.0 - (age_secs / float(self.freshness_max_age_seconds))))

        # 3. Confidence Factor (0.0 to 1.0)
        conf = confidence if confidence is not None else self.provider_confidence_defaults.get(p_clean, 0.70)
        if conf < self.min_confidence:
            return 0.0  # Rejected below minimum confidence

        # Multi-factor synthesis
        total_score = (
            (rank_score * (1.0 - self.freshness_weight)) +
            (freshness_score * self.freshness_weight)
        ) * conf

        return round(total_score, 2)


@dataclass
class SourcePriorityPolicy:
    """
    Full configurable priority policy containing metric-specific rules
    for a care subject or family.
    """
    id: uuid.UUID = field(default_factory=uuid.uuid4)
    name: str = "Configurable Multi-Device Source Priority"
    subject_id: Optional[uuid.UUID] = None
    rules: Dict[str, SourcePriorityRule] = field(default_factory=dict)

    @classmethod
    def create_default(cls, subject_id: Optional[uuid.UUID] = None) -> "SourcePriorityPolicy":
        """Creates default standard policy with configurable templates."""
        policy = cls(
            id=uuid.uuid4(),
            name="Default Source Priority Policy",
            subject_id=subject_id,
            rules={
                "steps": SourcePriorityRule(
                    metric="steps",
                    provider_priority=["apple_health", "garmin", "fitbit", "oura", "health_connect"],
                    freshness_weight=0.20,
                    min_confidence=0.60
                ),
                "distance": SourcePriorityRule(
                    metric="distance",
                    provider_priority=["garmin", "apple_health", "strava", "fitbit"],
                    freshness_weight=0.20,
                    min_confidence=0.60
                ),
                "sleep_duration": SourcePriorityRule(
                    metric="sleep_duration",
                    provider_priority=["oura", "whoop", "apple_health", "garmin", "fitbit"],
                    freshness_weight=0.15,
                    min_confidence=0.65
                ),
                "sleep_score": SourcePriorityRule(
                    metric="sleep_score",
                    provider_priority=["oura", "whoop", "garmin", "fitbit"],
                    freshness_weight=0.15,
                    min_confidence=0.65
                ),
                "heart_rate": SourcePriorityRule(
                    metric="heart_rate",
                    provider_priority=["garmin", "apple_health", "oura", "fitbit"],
                    freshness_weight=0.35,  # Real-time pulse prioritizes freshness
                    min_confidence=0.70
                ),
                "resting_heart_rate": SourcePriorityRule(
                    metric="resting_heart_rate",
                    provider_priority=["oura", "garmin", "apple_health", "fitbit"],
                    freshness_weight=0.20,
                    min_confidence=0.70
                ),
                "heart_rate_variability": SourcePriorityRule(
                    metric="heart_rate_variability",
                    provider_priority=["oura", "whoop", "garmin", "apple_health"],
                    freshness_weight=0.20,
                    min_confidence=0.75
                ),
                "blood_oxygen": SourcePriorityRule(
                    metric="blood_oxygen",
                    provider_priority=["garmin", "apple_health", "oura"],
                    freshness_weight=0.25,
                    min_confidence=0.75
                )
            }
        )
        return policy

    def get_rule_for_metric(self, metric: str) -> SourcePriorityRule:
        """Retrieves rule for metric, or generates fallback generic rule."""
        norm_key = metric.lower().strip()
        if norm_key in self.rules:
            return self.rules[norm_key]

        # Generic fallback rule
        return SourcePriorityRule(
            metric=norm_key,
            provider_priority=["apple_health", "garmin", "oura", "fitbit", "whoop", "health_connect"],
            freshness_weight=0.20,
            min_confidence=0.50
        )

    def set_rule(self, rule: SourcePriorityRule) -> None:
        """Adds or overrides a rule for a specific metric."""
        self.rules[rule.metric.lower().strip()] = rule


@dataclass
class PolicyResolvedMetric:
    """Detailed resolution breakdown for competing multi-device telemetry."""
    selected_metric: WearableMetric
    primary_provider: str
    metric_type: str
    resolution_score: float
    provider_priority_order: List[str]
    competing_scores: Dict[str, float]
    competing_values: Dict[str, Any]
    was_conflict: bool
    explanation: str


class ConfigurableSourcePriorityEngine:
    """
    Evaluates competing metrics from multiple concurrent devices against
    configurable policies considering metric, provider priority, freshness, and confidence.
    """

    @classmethod
    def resolve_competing_metrics(
        cls,
        metrics: List[WearableMetric],
        policy: Optional[SourcePriorityPolicy] = None,
        reference_time: Optional[datetime] = None
    ) -> List[PolicyResolvedMetric]:
        """
        Groups metrics by (date, metric_type), applies the configurable policy,
        and selects the highest-scoring candidate.
        """
        pol = policy or SourcePriorityPolicy.create_default()
        ref_dt = reference_time or datetime.now(timezone.utc)

        # Group by (date_str, metric_type_str)
        grouped: Dict[Tuple[str, str], List[WearableMetric]] = {}
        for m in metrics:
            dt_key = m.measured_at_utc.date().isoformat() if m.measured_at_utc else "unknown_date"
            type_key = m.metric_type.value if hasattr(m.metric_type, "value") else str(m.metric_type)
            key = (dt_key, type_key)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(m)

        resolved_metrics: List[PolicyResolvedMetric] = []

        for (dt_key, metric_str), candidates in grouped.items():
            rule = pol.get_rule_for_metric(metric_str)

            if len(candidates) == 1:
                single = candidates[0]
                prov = single.source_provider.value if hasattr(single.source_provider, "value") else str(single.source_provider)
                conf = single.metadata.get("confidence", None) if single.metadata else None
                score = rule.calculate_candidate_score(
                    provider_str=prov,
                    measured_at=single.measured_at_utc,
                    confidence=conf,
                    reference_time=ref_dt
                )
                resolved_metrics.append(
                    PolicyResolvedMetric(
                        selected_metric=single,
                        primary_provider=prov,
                        metric_type=metric_str,
                        resolution_score=score,
                        provider_priority_order=rule.provider_priority,
                        competing_scores={prov: score},
                        competing_values={prov: single.value},
                        was_conflict=False,
                        explanation=f"Single source: {prov} (score: {score:.1f})"
                    )
                )
            else:
                # Score all competing candidates
                scored_candidates: List[Tuple[float, WearableMetric, str]] = []
                scores_dict: Dict[str, float] = {}
                values_dict: Dict[str, Any] = {}

                for c in candidates:
                    prov = c.source_provider.value if hasattr(c.source_provider, "value") else str(c.source_provider)
                    conf = c.metadata.get("confidence", None) if c.metadata else None
                    score = rule.calculate_candidate_score(
                        provider_str=prov,
                        measured_at=c.measured_at_utc,
                        confidence=conf,
                        reference_time=ref_dt
                    )
                    scored_candidates.append((score, c, prov))
                    scores_dict[prov] = score
                    values_dict[prov] = c.value

                # Sort by score descending (highest score wins)
                scored_candidates.sort(key=lambda item: item[0], reverse=True)
                top_score, winner, win_prov = scored_candidates[0]

                priority_str = " → ".join(rule.provider_priority)
                explanation = (
                    f"Resolved {metric_str} conflict for {dt_key}: Selected {win_prov} "
                    f"(score: {top_score:.1f}, value: {winner.value}) over "
                    f"{', '.join([p for p in scores_dict if p != win_prov])} "
                    f"based on policy '{priority_str}'."
                )

                resolved_metrics.append(
                    PolicyResolvedMetric(
                        selected_metric=winner,
                        primary_provider=win_prov,
                        metric_type=metric_str,
                        resolution_score=top_score,
                        provider_priority_order=rule.provider_priority,
                        competing_scores=scores_dict,
                        competing_values=values_dict,
                        was_conflict=True,
                        explanation=explanation
                    )
                )

        return resolved_metrics
