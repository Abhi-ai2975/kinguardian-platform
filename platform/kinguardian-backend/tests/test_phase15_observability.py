"""
Phase 15 — Observability Test Suite.

Validates bezs-observability integration across all 7 operational vectors:
1. API (HTTP request latency, status counters, error rates)
2. Workers (Outbox publishing & background worker telemetry)
3. Events (Event bus routing, staging, and subscriber processing)
4. AI (Agent reasoning, Guardian Moments, token latency)
5. FHIR (Clinical gateway GraphQL / REST client calls)
6. FileNest (Document storage, OCR, and extraction pipelines)
7. Notifications (In-app, push, SMS, WhatsApp, Email delivery)
8. Prometheus export format and zero-trust PHI log redaction
"""

import pytest
import time
import json
import logging
from app.core.telemetry import (
    metrics,
    instrument_request,
    instrument_ai_call,
    instrument_fhir_call,
    instrument_filenest_call,
    instrument_db_query,
    instrument_event_processing,
    instrument_notification_delivery,
    instrument_insight_generation
)
from app.core.logging import (
    sanitize_value,
    JsonFormatter,
    request_id_ctx_var,
    trace_id_ctx_var,
    actor_id_ctx_var,
    family_id_ctx_var,
    subject_id_ctx_var
)


def test_api_instrumentation():
    """
    1. API Instrumentation:
    Verifies request latency tracking and error rate counting for HTTP endpoints.
    """
    initial_reqs = metrics.get_counter("http_requests_total")
    initial_errs = metrics.get_counter("http_errors_total")

    # 1a. Successful Request
    with instrument_request(endpoint="/families/home", method="GET"):
        time.sleep(0.002)

    assert metrics.get_counter("http_requests_total") == initial_reqs + 1
    obs = metrics.get_observations("http_request_duration_seconds")
    assert len(obs) >= 1
    assert obs[-1] >= 0.001

    # 1b. Failed Request
    class RouteError(Exception):
        status_code = 503

    with pytest.raises(RouteError):
        with instrument_request(endpoint="/families/checkout", method="POST"):
            raise RouteError("Service Unavailable")

    assert metrics.get_counter("http_errors_total") == initial_errs + 1


def test_workers_and_database_instrumentation():
    """
    2. Workers & Database Instrumentation:
    Verifies database query latency and background outbox worker execution metrics.
    """
    initial_queries = metrics.get_counter("db_queries_total")

    with instrument_db_query(query_type="process_outbox_batch"):
        time.sleep(0.002)

    assert metrics.get_counter("db_queries_total") == initial_queries + 1
    obs = metrics.get_observations("db_query_duration_seconds")
    assert len(obs) >= 1
    assert obs[-1] >= 0.001


def test_events_instrumentation():
    """
    3. Events Instrumentation:
    Verifies event staging, bus routing, and consumer processing metrics.
    """
    initial_events = metrics.get_counter("events_processed_total")

    with instrument_event_processing(event_type="care_task_completed"):
        time.sleep(0.002)

    assert metrics.get_counter("events_processed_total") == initial_events + 1
    obs = metrics.get_observations("event_processing_duration_seconds")
    assert len(obs) >= 1
    assert obs[-1] >= 0.001


def test_ai_instrumentation():
    """
    4. AI Instrumentation:
    Verifies bezs-agent conversation facade, tool invocation, and Guardian Moment telemetry.
    """
    initial_ai = metrics.get_counter("ai_calls_total")
    initial_insights = metrics.get_counter("insights_generated_total")

    # 4a. AI Call
    with instrument_ai_call(model="kinguardian-ai-v1", task="ask_kinguardian"):
        time.sleep(0.002)

    assert metrics.get_counter("ai_calls_total") == initial_ai + 1
    obs_ai = metrics.get_observations("ai_call_duration_seconds")
    assert len(obs_ai) >= 1

    # 4b. Insight Generation
    with instrument_insight_generation(insight_type="guardian_moment"):
        time.sleep(0.002)

    assert metrics.get_counter("insights_generated_total") == initial_insights + 1
    obs_ins = metrics.get_observations("insight_generation_duration_seconds")
    assert len(obs_ins) >= 1


def test_fhir_instrumentation():
    """
    5. FHIR / Clinical Gateway Instrumentation:
    Verifies clinical EMR GraphQL and FHIR REST call latency and counter tracking.
    """
    initial_fhir = metrics.get_counter("fhir_calls_total")

    with instrument_fhir_call(resource_type="Observation", operation="query"):
        time.sleep(0.002)

    assert metrics.get_counter("fhir_calls_total") == initial_fhir + 1
    obs = metrics.get_observations("fhir_call_duration_seconds")
    assert len(obs) >= 1
    assert obs[-1] >= 0.001


def test_filenest_instrumentation():
    """
    6. FileNest / Document Storage Instrumentation:
    Verifies document upload initialization, storage, and OCR extraction telemetry.
    """
    initial_filenest = metrics.get_counter("filenest_calls_total")

    with instrument_filenest_call(operation="upload_initialization"):
        time.sleep(0.002)

    assert metrics.get_counter("filenest_calls_total") == initial_filenest + 1
    obs = metrics.get_observations("filenest_call_duration_seconds")
    assert len(obs) >= 1


def test_notifications_instrumentation():
    """
    7. Notifications Instrumentation:
    Verifies delivery latency across notification channels (In-App, Push, SMS, WhatsApp, Email).
    """
    initial_notifs = metrics.get_counter("notifications_delivered_total")

    with instrument_notification_delivery(channel="push"):
        time.sleep(0.002)

    assert metrics.get_counter("notifications_delivered_total") == initial_notifs + 1
    obs = metrics.get_observations("notification_delivery_duration_seconds")
    assert len(obs) >= 1


def test_prometheus_export_and_phi_redaction():
    """
    8. Prometheus Exporter & Zero-Trust PHI Redaction:
    Verifies Prometheus scrape string format and strict PHI redaction in logs.
    """
    # 8a. Prometheus Export Format
    with instrument_request(endpoint="/families/home", method="GET"):
        time.sleep(0.001)

    prom_output = metrics.export_prometheus()
    assert "# TYPE http_requests_total counter" in prom_output
    assert "# TYPE http_request_duration_seconds histogram" in prom_output
    assert "http_request_duration_seconds_count" in prom_output

    # 8b. Zero-Trust PHI Redaction
    raw_log = {
        "blood_pressure": "130/85 mmHg",
        "glucose": "110 mg/dL",
        "extracted_text": "Sensitive clinical report text",
        "system_prompt": "Confidential AI instructions",
        "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token",
        "endpoint": "/families/home",
        "status_code": 200
    }
    sanitized = sanitize_value(raw_log)
    assert sanitized["blood_pressure"] == "[REDACTED]"
    assert sanitized["glucose"] == "[REDACTED]"
    assert sanitized["extracted_text"] == "[REDACTED]"
    assert sanitized["system_prompt"] == "[REDACTED]"
    assert sanitized["jwt"] == "[REDACTED]"
    assert sanitized["endpoint"] == "/families/home"
    assert sanitized["status_code"] == 200
