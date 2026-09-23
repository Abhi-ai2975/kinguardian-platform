"""
Worker — MetricWorker.

Consumes metric events from stream:metric (CPU, memory, request counts,
latency histograms, custom business metrics).
"""

from src.workers.base import BaseWorker


class MetricWorker(BaseWorker):
    """Processes metric telemetry events from stream:metric."""
    stream_topic = "stream:metric"
    group_name = "cg:metric"
