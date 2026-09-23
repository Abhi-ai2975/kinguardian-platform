import uuid
from typing import List, Dict, Any, Optional, Type
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.domains.family.domain.interfaces import IFamilyRepository, IEventLogger
from app.domains.family.domain.entities import AIInsightEntity
from app.domains.insights.strategies import (
    BaseTrendStrategy,
    TrendAnalysisResult,
    ActivityTrendStrategy,
    SleepTrendStrategy,
    BloodPressureTrendStrategy,
    WeightTrendStrategy,
    GlucoseTrendStrategy,
    WearableCardiovascularTrendStrategy,
    MultiSourceCorrelationStrategy
)

logger = get_logger(__name__)


class InsightEngine:
    """
    InsightEngine:
    Orchestrates metric trend detection strategies, generates and persists AI Insights and Guardian Moments.

    Decoupled Flow:
    Open Wearables
          ↓
    Normalized wearable data
          ↓
    Trend/Baseline Engine
          ↓
    Insight Engine
          ↓
    AI explanation
          ↓
    Guardian Moment

    IMPORTANT: InsightEngine NEVER directly creates or sends notifications.
    """

    DEFAULT_STRATEGIES: List[Type[BaseTrendStrategy]] = [
        ActivityTrendStrategy,
        SleepTrendStrategy,
        BloodPressureTrendStrategy,
        WeightTrendStrategy,
        GlucoseTrendStrategy,
        WearableCardiovascularTrendStrategy,
        MultiSourceCorrelationStrategy
    ]



    def __init__(
        self,
        family_repo: IFamilyRepository,
        event_logger: IEventLogger,
        strategies: Optional[List[BaseTrendStrategy]] = None
    ):
        self.family_repo = family_repo
        self.event_logger = event_logger
        self.strategies: List[BaseTrendStrategy] = strategies or [cls() for cls in self.DEFAULT_STRATEGIES]

    def register_strategy(self, strategy: BaseTrendStrategy) -> None:
        """Registers a custom metric trend strategy."""
        self.strategies.append(strategy)

    async def analyze_and_generate_insights(
        self,
        subject_id: uuid.UUID,
        family_id: uuid.UUID,
        observations: List[Dict[str, Any]],
        timeframe_days: int = 7
    ) -> List[AIInsightEntity]:
        """
        Executes metric trend strategies against observations, persists detected insights,
        and emits domain events for downstream notification policy evaluation.
        """
        created_insights: List[AIInsightEntity] = []

        for strategy in self.strategies:
            try:
                trend: Optional[TrendAnalysisResult] = await strategy.analyze(
                    subject_id=subject_id,
                    family_id=family_id,
                    observations=observations,
                    timeframe_days=timeframe_days
                )

                if trend and trend.detected:
                    logger.info(
                        f"InsightEngine: Trend detected by '{strategy.metric_name}': '{trend.title}' "
                        f"(Severity: {trend.severity}) for subject {subject_id}."
                    )

                    # 1. Persist Insight
                    insight = await self.family_repo.add_ai_insight(
                        family_id=family_id,
                        subject_id=subject_id,
                        type=trend.type,
                        severity=trend.severity,
                        title=trend.title,
                        summary=trend.summary,
                        observation=trend.observation,
                        recommendation=trend.recommendation,
                        timeframe_start=trend.timeframe_start,
                        timeframe_end=trend.timeframe_end,
                        confidence=trend.confidence,
                        status="active",
                        generated_by=f"insight_engine_{strategy.metric_name}",
                        baseline_comparison=trend.baseline_comparison,
                        actionability=trend.actionability
                    )

                    # 2. Persist Insight Source Records
                    for src in trend.source_records:
                        await self.family_repo.add_ai_insight_source(
                            insight_id=insight.id,
                            source_type=src.get("source_type", strategy.metric_name),
                            source_id=src.get("source_id", str(subject_id)),
                            source_version="1.0",
                            metadata=src.get("metadata", {})
                        )

                    # 3. Emit Domain Event (Decoupled trigger for Notification Policy)
                    event_type = "guardian_moment_created" if trend.type == "guardian_moment" else "ai_insight_generated"
                    await self.event_logger.log_event(
                        care_circle_id=family_id,
                        event_type=event_type,
                        payload={
                            "insight_id": str(insight.id),
                            "subject_id": str(subject_id),
                            "metric_name": strategy.metric_name,
                            "title": trend.title,
                            "summary": trend.summary,
                            "severity": trend.severity,
                            "type": trend.type,
                            "recommendation": trend.recommendation
                        },
                        aggregate_type="ai_insight",
                        aggregate_id=str(insight.id)
                    )

                    created_insights.append(insight)

            except Exception as e:
                logger.error(
                    f"InsightEngine: Error executing strategy '{strategy.metric_name}' for subject {subject_id}: {e}",
                    exc_info=True
                )

        return created_insights

    async def process_wearable_metrics(
        self,
        subject_id: uuid.UUID,
        family_id: uuid.UUID,
        metrics: List[Any],
        timeframe_days: int = 7
    ) -> List[AIInsightEntity]:
        """
        Feeds normalized wearable telemetry directly into the existing InsightEngine.
        Converts WearableMetric domain models to observations and executes trend/baseline analysis.
        Follows the core flow:
        Open Wearables -> Normalized Wearable Data -> Trend/Baseline Engine -> Insight Engine -> AI Explanation -> Guardian Moment.
        """
        observations: List[Dict[str, Any]] = []
        for m in metrics:
            if hasattr(m, "metric_type"):
                # WearableMetric domain model
                observations.append({
                    "code": m.metric_type.value,
                    "value": m.value,
                    "unit": m.unit,
                    "effective_time": m.measured_at_utc.isoformat() if hasattr(m, "measured_at_utc") else m.measured_at.isoformat(),
                    "source": m.source_provider.value if hasattr(m.source_provider, "value") else str(m.source_provider)
                })
            elif isinstance(m, dict):
                code = m.get("metric") or m.get("metric_type") or m.get("code")
                observations.append({
                    "code": str(code),
                    "value": m.get("value"),
                    "unit": m.get("unit"),
                    "effective_time": str(m.get("measured_at_utc") or m.get("measured_at") or m.get("timestamp")),
                    "source": str(m.get("source_provider") or m.get("provider") or "wearable")
                })

        return await self.analyze_and_generate_insights(
            subject_id=subject_id,
            family_id=family_id,
            observations=observations,
            timeframe_days=timeframe_days
        )

