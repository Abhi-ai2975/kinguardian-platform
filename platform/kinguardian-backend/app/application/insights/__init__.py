"""
Application Insights Package:
Orchestrates statistical baseline calculations, trend detection strategies, and Guardian Moment insights.
"""

from app.domains.insights.engine import InsightEngine
from app.domains.insights.baseline import BaselineService, BaselineCalculator
from app.domains.insights.strategies import BaseTrendStrategy, TrendAnalysisResult

__all__ = [
    "InsightEngine",
    "BaselineService",
    "BaselineCalculator",
    "BaseTrendStrategy",
    "TrendAnalysisResult"
]
