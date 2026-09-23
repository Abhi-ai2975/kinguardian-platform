"""
Mock Observability Gateway.
Records traces, spans, and metrics in-memory for unit testing and local inspection.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class MockObservabilityGateway:
    """
    In-memory Mock Observability Gateway.
    Records emitted spans and metrics in memory without making network calls.
    """

    def __init__(self):
        self.spans: List[Dict[str, Any]] = []
        self.metrics: List[Dict[str, Any]] = []

    async def emit_span(
        self,
        name: str,
        trace_id: str,
        span_id: str,
        parent_span_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None,
        duration_ms: float = 0.0
    ) -> bool:
        record = {
            "name": name,
            "trace_id": trace_id,
            "span_id": span_id,
            "parent_span_id": parent_span_id,
            "attributes": attributes or {},
            "duration_ms": duration_ms,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.spans.append(record)
        return True

    async def emit_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "count",
        labels: Optional[Dict[str, str]] = None
    ) -> bool:
        record = {
            "metric_name": metric_name,
            "value": value,
            "unit": unit,
            "labels": labels or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.metrics.append(record)
        return True

    def get_span_count(self) -> int:
        return len(self.spans)

    def get_metric_count(self) -> int:
        return len(self.metrics)

    def clear(self):
        self.spans.clear()
        self.metrics.clear()
