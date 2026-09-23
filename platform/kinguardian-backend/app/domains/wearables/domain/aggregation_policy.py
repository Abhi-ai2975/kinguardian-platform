"""
Wearable Metric Aggregation & Duplicate Handling Policy.

Governs multi-source deduplication, aggregation, preferred source selection,
and immutable source provenance attribution across all wearable metrics.

CORE INVARIANTS:
1. When multiple sources provide telemetry for the same metric and time period,
   do NOT simply double count.
2. Every derived/aggregated metric MUST retain full source provenance.
"""

from enum import Enum
from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
import uuid

from app.domains.wearables.domain.entities import WearableMetric
from app.domains.wearables.domain.value_objects import DeviceProvider, WearableMetricType
from app.domains.wearables.domain.source_priority_policy import SourcePriorityPolicy, SourcePriorityRule


class AggregationMethod(str, Enum):
    PREFERRED_SOURCE = "preferred_source"      # Select authoritative source per priority; discard duplicates
    WEIGHTED_AVERAGE = "weighted_average"      # Confidence-weighted mean (e.g. for vitals / temp / SpO2)
    MAX = "max"                                # Peak observation (e.g. peak workout HR)
    MIN = "min"                                # Nadir observation (e.g. lowest nocturnal resting HR)
    MEDIAN = "median"                          # Robust central tendency across 3+ devices


@dataclass(frozen=True)
class SourceProvenance:
    """
    Immutable lineage record tracking the exact source(s), raw inputs,
    and aggregation method used to derive a metric.
    """
    primary_source: str
    contributing_sources: List[str]
    raw_values_by_source: Dict[str, Any]
    aggregation_method: AggregationMethod
    deduplication_applied: bool
    resolved_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    policy_name: str = "MetricAggregationPolicy"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "primary_source": self.primary_source,
            "contributing_sources": self.contributing_sources,
            "raw_values_by_source": self.raw_values_by_source,
            "aggregation_method": self.aggregation_method.value,
            "deduplication_applied": self.deduplication_applied,
            "resolved_at": self.resolved_at.isoformat(),
            "policy_name": self.policy_name
        }


@dataclass
class MetricAggregationRule:
    """Configurable aggregation and deduplication behavior for a specific metric."""
    metric_type: str
    method: AggregationMethod = AggregationMethod.PREFERRED_SOURCE
    preferred_source_order: List[str] = field(default_factory=lambda: [
        "garmin", "apple_health", "oura", "fitbit", "whoop"
    ])
    prevent_double_counting: bool = True
    time_bucket_minutes: int = 1440  # 1440 mins = 1 day


@dataclass
class AggregatedWearableMetric:
    """
    Normalized, deduplicated metric instance carrying rich source provenance.
    """
    subject_id: uuid.UUID
    metric_type: str
    value: Any
    unit: Optional[str]
    timeframe_start: datetime
    timeframe_end: datetime
    provenance: SourceProvenance
    raw_records_count: int = 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subject_id": str(self.subject_id),
            "metric_type": self.metric_type,
            "value": self.value,
            "unit": self.unit,
            "timeframe_start": self.timeframe_start.isoformat(),
            "timeframe_end": self.timeframe_end.isoformat(),
            "raw_records_count": self.raw_records_count,
            "provenance": self.provenance.to_dict()
        }


class MetricAggregationPolicy:
    """
    Domain policy orchestrating preferred source resolution, deduplication,
    aggregation, and provenance retention for multi-device streams.
    """

    def __init__(
        self,
        name: str = "Standard Metric Aggregation Policy",
        rules: Optional[Dict[str, MetricAggregationRule]] = None,
        source_priority_policy: Optional[SourcePriorityPolicy] = None
    ):
        self.name = name
        self.source_priority_policy = source_priority_policy or SourcePriorityPolicy.create_default()
        self.rules: Dict[str, MetricAggregationRule] = rules or {
            # Activity metrics -> Strict PREFERRED_SOURCE (Prevents duplicate step counting)
            "steps": MetricAggregationRule(
                metric_type="steps",
                method=AggregationMethod.PREFERRED_SOURCE,
                preferred_source_order=["garmin", "apple_health", "fitbit", "oura"],
                prevent_double_counting=True
            ),
            "distance": MetricAggregationRule(
                metric_type="distance",
                method=AggregationMethod.PREFERRED_SOURCE,
                preferred_source_order=["garmin", "apple_health", "strava", "fitbit"],
                prevent_double_counting=True
            ),
            "calories": MetricAggregationRule(
                metric_type="calories",
                method=AggregationMethod.PREFERRED_SOURCE,
                preferred_source_order=["garmin", "apple_health", "fitbit", "oura"],
                prevent_double_counting=True
            ),
            # Sleep metrics -> Strict PREFERRED_SOURCE (Oura preferred)
            "sleep_duration": MetricAggregationRule(
                metric_type="sleep_duration",
                method=AggregationMethod.PREFERRED_SOURCE,
                preferred_source_order=["oura", "whoop", "apple_health", "garmin", "fitbit"],
                prevent_double_counting=True
            ),
            # Resting Heart Rate -> MIN or PREFERRED_SOURCE (Lowest true nocturnal resting pulse)
            "resting_heart_rate": MetricAggregationRule(
                metric_type="resting_heart_rate",
                method=AggregationMethod.MIN,
                preferred_source_order=["oura", "garmin", "apple_health", "fitbit"],
                prevent_double_counting=True
            ),
            # Heart Rate Variability -> PREFERRED_SOURCE (Oura/Whoop)
            "heart_rate_variability": MetricAggregationRule(
                metric_type="heart_rate_variability",
                method=AggregationMethod.PREFERRED_SOURCE,
                preferred_source_order=["oura", "whoop", "garmin", "apple_health"],
                prevent_double_counting=True
            ),
            # Blood Oxygen -> WEIGHTED_AVERAGE
            "blood_oxygen": MetricAggregationRule(
                metric_type="blood_oxygen",
                method=AggregationMethod.WEIGHTED_AVERAGE,
                preferred_source_order=["garmin", "apple_health", "oura"],
                prevent_double_counting=True
            )
        }

    def get_rule(self, metric_type: str) -> MetricAggregationRule:
        """Retrieves rule for metric or provides sensible default."""
        norm_key = metric_type.lower().strip()
        if norm_key in self.rules:
            return self.rules[norm_key]
        return MetricAggregationRule(
            metric_type=norm_key,
            method=AggregationMethod.PREFERRED_SOURCE,
            prevent_double_counting=True
        )

    def set_rule(self, rule: MetricAggregationRule) -> None:
        self.rules[rule.metric_type.lower().strip()] = rule

    def aggregate_metrics(
        self,
        metrics: List[WearableMetric],
        reference_time: Optional[datetime] = None
    ) -> List[AggregatedWearableMetric]:
        """
        Executes policy-driven deduplication and multi-source aggregation.
        Guarantees that metrics in the same time bucket are never double-counted,
        and every resulting metric retains full source provenance.
        """
        if not metrics:
            return []

        ref_dt = reference_time or datetime.now(timezone.utc)

        # 1. Bucket metrics by (date_str, metric_type_str)
        buckets: Dict[Tuple[str, str], List[WearableMetric]] = {}
        for m in metrics:
            dt_key = m.measured_at_utc.date().isoformat() if m.measured_at_utc else "unknown_date"
            type_key = m.metric_type.value if hasattr(m.metric_type, "value") else str(m.metric_type)
            key = (dt_key, type_key)
            if key not in buckets:
                buckets[key] = []
            buckets[key].append(m)

        aggregated_results: List[AggregatedWearableMetric] = []

        # 2. Apply Rule to each bucket
        for (dt_key, metric_type_str), candidates in buckets.items():
            rule = self.get_rule(metric_type_str)
            subj_id = candidates[0].subject_id
            unit_val = candidates[0].unit

            # Determine timeframe window
            t_starts = [c.measured_at_utc for c in candidates if c.measured_at_utc]
            start_dt = min(t_starts) if t_starts else ref_dt
            end_dt = max(t_starts) if t_starts else ref_dt

            # Collect raw values by source
            raw_by_source: Dict[str, Any] = {}
            for c in candidates:
                p_name = c.source_provider.value if hasattr(c.source_provider, "value") else str(c.source_provider)
                raw_by_source[p_name] = c.value

            contributing_sources = list(raw_by_source.keys())
            has_duplicates = len(candidates) > 1

            # Execute aggregation method
            if len(candidates) == 1:
                single = candidates[0]
                prov_name = single.source_provider.value if hasattr(single.source_provider, "value") else str(single.source_provider)
                provenance = SourceProvenance(
                    primary_source=prov_name,
                    contributing_sources=[prov_name],
                    raw_values_by_source=raw_by_source,
                    aggregation_method=AggregationMethod.PREFERRED_SOURCE,
                    deduplication_applied=False,
                    policy_name=self.name
                )
                aggregated_results.append(
                    AggregatedWearableMetric(
                        subject_id=subj_id,
                        metric_type=metric_type_str,
                        value=single.value,
                        unit=unit_val,
                        timeframe_start=start_dt,
                        timeframe_end=end_dt,
                        provenance=provenance,
                        raw_records_count=1
                    )
                )
            else:
                # Multiple sources exist for this time period -> Must NOT simply double count!
                if rule.method == AggregationMethod.PREFERRED_SOURCE:
                    # Resolve using source priority policy
                    pri_rule = self.source_priority_policy.get_rule_for_metric(metric_type_str)
                    if rule.preferred_source_order:
                        pri_rule = SourcePriorityRule(
                            metric=metric_type_str,
                            provider_priority=rule.preferred_source_order,
                            freshness_weight=pri_rule.freshness_weight,
                            min_confidence=pri_rule.min_confidence
                        )
                    scored = []
                    for c in candidates:
                        p_name = c.source_provider.value if hasattr(c.source_provider, "value") else str(c.source_provider)
                        conf = c.metadata.get("confidence", None) if c.metadata else None
                        score = pri_rule.calculate_candidate_score(p_name, c.measured_at_utc, conf, ref_dt)
                        scored.append((score, c, p_name))


                    scored.sort(key=lambda x: x[0], reverse=True)
                    winner_score, winner_metric, winner_provider = scored[0]

                    provenance = SourceProvenance(
                        primary_source=winner_provider,
                        contributing_sources=contributing_sources,
                        raw_values_by_source=raw_by_source,
                        aggregation_method=AggregationMethod.PREFERRED_SOURCE,
                        deduplication_applied=True,
                        policy_name=self.name
                    )

                    aggregated_results.append(
                        AggregatedWearableMetric(
                            subject_id=subj_id,
                            metric_type=metric_type_str,
                            value=winner_metric.value,  # Authoritative single value (NO DOUBLE COUNTING)
                            unit=unit_val,
                            timeframe_start=start_dt,
                            timeframe_end=end_dt,
                            provenance=provenance,
                            raw_records_count=len(candidates)
                        )
                    )

                elif rule.method == AggregationMethod.MIN:
                    # Useful for resting heart rate (nadir)
                    min_candidate = min(candidates, key=lambda c: float(c.value))
                    min_prov = min_candidate.source_provider.value if hasattr(min_candidate.source_provider, "value") else str(min_candidate.source_provider)

                    provenance = SourceProvenance(
                        primary_source=min_prov,
                        contributing_sources=contributing_sources,
                        raw_values_by_source=raw_by_source,
                        aggregation_method=AggregationMethod.MIN,
                        deduplication_applied=True,
                        policy_name=self.name
                    )

                    aggregated_results.append(
                        AggregatedWearableMetric(
                            subject_id=subj_id,
                            metric_type=metric_type_str,
                            value=min_candidate.value,
                            unit=unit_val,
                            timeframe_start=start_dt,
                            timeframe_end=end_dt,
                            provenance=provenance,
                            raw_records_count=len(candidates)
                        )
                    )

                elif rule.method == AggregationMethod.MAX:
                    # Useful for peak heart rate
                    max_candidate = max(candidates, key=lambda c: float(c.value))
                    max_prov = max_candidate.source_provider.value if hasattr(max_candidate.source_provider, "value") else str(max_candidate.source_provider)

                    provenance = SourceProvenance(
                        primary_source=max_prov,
                        contributing_sources=contributing_sources,
                        raw_values_by_source=raw_by_source,
                        aggregation_method=AggregationMethod.MAX,
                        deduplication_applied=True,
                        policy_name=self.name
                    )

                    aggregated_results.append(
                        AggregatedWearableMetric(
                            subject_id=subj_id,
                            metric_type=metric_type_str,
                            value=max_candidate.value,
                            unit=unit_val,
                            timeframe_start=start_dt,
                            timeframe_end=end_dt,
                            provenance=provenance,
                            raw_records_count=len(candidates)
                        )
                    )

                elif rule.method == AggregationMethod.WEIGHTED_AVERAGE:
                    # Useful for SpO2 / body temperature
                    total_weight = 0.0
                    weighted_sum = 0.0
                    pri_rule = self.source_priority_policy.get_rule_for_metric(metric_type_str)

                    for c in candidates:
                        p_name = c.source_provider.value if hasattr(c.source_provider, "value") else str(c.source_provider)
                        conf = c.metadata.get("confidence", None) if c.metadata else None
                        weight = pri_rule.calculate_candidate_score(p_name, c.measured_at_utc, conf, ref_dt)
                        weighted_sum += float(c.value) * weight
                        total_weight += weight

                    avg_val = round(weighted_sum / total_weight, 2) if total_weight > 0 else round(sum(float(c.value) for c in candidates) / len(candidates), 2)
                    primary_prov = contributing_sources[0]

                    provenance = SourceProvenance(
                        primary_source=f"composite ({', '.join(contributing_sources)})",
                        contributing_sources=contributing_sources,
                        raw_values_by_source=raw_by_source,
                        aggregation_method=AggregationMethod.WEIGHTED_AVERAGE,
                        deduplication_applied=True,
                        policy_name=self.name
                    )

                    aggregated_results.append(
                        AggregatedWearableMetric(
                            subject_id=subj_id,
                            metric_type=metric_type_str,
                            value=avg_val,
                            unit=unit_val,
                            timeframe_start=start_dt,
                            timeframe_end=end_dt,
                            provenance=provenance,
                            raw_records_count=len(candidates)
                        )
                    )

        return aggregated_results
