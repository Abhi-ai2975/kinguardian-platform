"""
Infrastructure Observability Layer:
Audit logging, OpenTelemetry distributed tracing, and bezs-observability Prometheus metrics.
"""

from app.domains.events.audit import AuditService, AuditEventRecord
from app.core.telemetry import (
    setup_telemetry,
    metrics,
    track_latency,
    increment_counter,
    instrument_request,
    instrument_ai_call,
    instrument_fhir_call,
    instrument_filenest_call,
    instrument_db_query,
    instrument_event_processing,
    instrument_notification_delivery,
    instrument_insight_generation
)

__all__ = [
    "AuditService",
    "AuditEventRecord",
    "setup_telemetry",
    "metrics",
    "track_latency",
    "increment_counter",
    "instrument_request",
    "instrument_ai_call",
    "instrument_fhir_call",
    "instrument_filenest_call",
    "instrument_db_query",
    "instrument_event_processing",
    "instrument_notification_delivery",
    "instrument_insight_generation"
]
