"""
Core Telemetry & bezs-observability Integration:
Provides instrumentation for:
1. request latency (http_request_duration_seconds)
2. error rates (http_errors_total, app_errors_total)
3. AI calls (ai_calls_total, ai_call_duration_seconds)
4. FHIR calls (fhir_calls_total, fhir_call_duration_seconds)
5. FileNest calls (filenest_calls_total, filenest_call_duration_seconds)
6. database latency (db_query_duration_seconds, db_queries_total)
7. event processing (events_processed_total, event_processing_duration_seconds)
8. notification delivery (notifications_delivered_total, notification_delivery_duration_seconds)
9. insight generation (insights_generated_total, insight_generation_duration_seconds)
"""

import time
import functools
from typing import Dict, Any, Optional, List, Callable
from contextlib import contextmanager
from app.core.logging import get_logger

logger = get_logger(__name__)


class MetricsCollector:
    """
    In-memory metrics collector aligned with bezs-observability & Prometheus standards.
    """
    def __init__(self):
        self._counters: Dict[str, int] = {}
        self._gauges: Dict[str, float] = {}
        self._histograms: Dict[str, List[float]] = {}
        self._tagged_counters: Dict[str, Dict[str, int]] = {}

    def increment(self, metric: str, value: int = 1, tags: Optional[Dict[str, str]] = None) -> None:
        self._counters[metric] = self._counters.get(metric, 0) + value
        if tags:
            tag_key = str(sorted(tags.items()))
            if metric not in self._tagged_counters:
                self._tagged_counters[metric] = {}
            self._tagged_counters[metric][tag_key] = self._tagged_counters[metric].get(tag_key, 0) + value

    def gauge(self, metric: str, value: float, tags: Optional[Dict[str, str]] = None) -> None:
        self._gauges[metric] = value

    def observe(self, metric: str, value: float, tags: Optional[Dict[str, str]] = None) -> None:
        if metric not in self._histograms:
            self._histograms[metric] = []
        self._histograms[metric].append(value)

    def get_counter(self, metric: str) -> int:
        return self._counters.get(metric, 0)

    def get_gauge(self, metric: str) -> Optional[float]:
        return self._gauges.get(metric)

    def get_observations(self, metric: str) -> List[float]:
        return self._histograms.get(metric, [])

    def export_prometheus(self) -> str:
        lines = []
        for c_name, c_val in sorted(self._counters.items()):
            lines.append(f"# TYPE {c_name} counter")
            lines.append(f"{c_name} {c_val}")
        for g_name, g_val in sorted(self._gauges.items()):
            lines.append(f"# TYPE {g_name} gauge")
            lines.append(f"{g_name} {g_val}")
        for h_name, h_vals in sorted(self._histograms.items()):
            lines.append(f"# TYPE {h_name} histogram")
            count = len(h_vals)
            total_sum = sum(h_vals)
            lines.append(f"{h_name}_count {count}")
            lines.append(f"{h_name}_sum {total_sum:.6f}")
        return "\n".join(lines)


metrics = MetricsCollector()


def increment_counter(metric: str, value: int = 1, tags: Optional[Dict[str, str]] = None) -> None:
    metrics.increment(metric, value, tags)


@contextmanager
def track_latency(metric_name: str, tags: Optional[Dict[str, str]] = None):
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe(metric_name, elapsed, tags)


# ==========================================
# Specialized Domain Instrumentation Helpers
# ==========================================

# 1. Request Latency & Error Rates
@contextmanager
def instrument_request(endpoint: str, method: str = "GET"):
    start = time.perf_counter()
    status_code = 200
    try:
        yield
    except Exception as e:
        status_code = getattr(e, "status_code", 500)
        metrics.increment("http_errors_total", 1, {"endpoint": endpoint, "status": str(status_code)})
        raise
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe("http_request_duration_seconds", elapsed, {"endpoint": endpoint, "method": method})
        metrics.increment("http_requests_total", 1, {"endpoint": endpoint, "status": str(status_code)})


# 2. AI Calls
@contextmanager
def instrument_ai_call(model: str = "kinguardian-ai-v1", task: str = "qna"):
    start = time.perf_counter()
    metrics.increment("ai_calls_total", 1, {"model": model, "task": task})
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe("ai_call_duration_seconds", elapsed, {"model": model, "task": task})


# 3. FHIR Calls
@contextmanager
def instrument_fhir_call(resource_type: str, operation: str = "read"):
    start = time.perf_counter()
    metrics.increment("fhir_calls_total", 1, {"resource": resource_type, "op": operation})
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe("fhir_call_duration_seconds", elapsed, {"resource": resource_type, "op": operation})


# 4. FileNest Calls
@contextmanager
def instrument_filenest_call(operation: str = "upload"):
    start = time.perf_counter()
    metrics.increment("filenest_calls_total", 1, {"operation": operation})
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe("filenest_call_duration_seconds", elapsed, {"operation": operation})


# 5. Database Latency
@contextmanager
def instrument_db_query(query_type: str = "select"):
    start = time.perf_counter()
    metrics.increment("db_queries_total", 1, {"type": query_type})
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe("db_query_duration_seconds", elapsed, {"type": query_type})


# 6. Event Processing
@contextmanager
def instrument_event_processing(event_type: str):
    start = time.perf_counter()
    metrics.increment("events_processed_total", 1, {"event_type": event_type})
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe("event_processing_duration_seconds", elapsed, {"event_type": event_type})


# 7. Notification Delivery
@contextmanager
def instrument_notification_delivery(channel: str = "push"):
    start = time.perf_counter()
    metrics.increment("notifications_delivered_total", 1, {"channel": channel})
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe("notification_delivery_duration_seconds", elapsed, {"channel": channel})


# 8. Insight Generation
@contextmanager
def instrument_insight_generation(insight_type: str = "vital_trends"):
    start = time.perf_counter()
    metrics.increment("insights_generated_total", 1, {"type": insight_type})
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe("insight_generation_duration_seconds", elapsed, {"type": insight_type})


def setup_telemetry(app=None) -> None:
    logger.info("bezs-observability telemetry and metrics pipeline initialized.")
