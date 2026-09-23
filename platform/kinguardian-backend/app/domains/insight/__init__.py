"""
Insight Domain Module:
Bounded domain for Guardian Moments, AI Insights, Baseline Analytics, and Trend Detection.
"""

from app.domains.insights.baseline import (
    BaselineService,
    BaselineCalculator,
    DataPoint,
    MetricBaselineResult,
    BaselineComparison
)
from app.domains.insights.engine import InsightEngine
from app.domains.insights.strategies import (
    BaseTrendStrategy,
    TrendAnalysisResult
)
from app.domains.family.infrastructure.models import AIInsight, AIInsightSource
from app.domains.family.domain.entities import AIInsightEntity, AIInsightSourceEntity
from app.domains.family.schemas import (
    AIInsightCreate,
    AIInsightResponse,
    AIInsightSourceCreate,
    AIInsightSourceResponse
)

BaselineDeviationResult = BaselineComparison
TrendDetectionStrategy = BaseTrendStrategy

__all__ = [
    "BaselineService",
    "BaselineCalculator",
    "DataPoint",
    "MetricBaselineResult",
    "BaselineComparison",
    "BaselineDeviationResult",
    "InsightEngine",
    "BaseTrendStrategy",
    "TrendDetectionStrategy",
    "TrendAnalysisResult",
    "AIInsight",
    "AIInsightSource",
    "AIInsightEntity",
    "AIInsightSourceEntity",
    "AIInsightCreate",
    "AIInsightResponse",
    "AIInsightSourceCreate",
    "AIInsightSourceResponse"
]
