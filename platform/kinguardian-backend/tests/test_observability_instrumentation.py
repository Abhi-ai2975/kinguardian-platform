"""
bezs-observability Telemetry & Instrumentation Test Suite:
Verifies instrumentation across all 9 core operational vectors:
1. Request latency
2. Error rates
3. AI calls
4. FHIR calls
5. FileNest calls
6. Database latency
7. Event processing
8. Notification delivery
9. Insight generation
"""

import pytest
import time
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


def test_request_latency_and_error_rate_instrumentation():
    # Success request
    with instrument_request(endpoint="/api/v1/family/dashboard", method="GET"):
        time.sleep(0.005)

    assert metrics.get_counter("http_requests_total") >= 1
    obs = metrics.get_observations("http_request_duration_seconds")
    assert len(obs) >= 1
    assert obs[-1] >= 0.004

    # Error request
    class CustomHTTPError(Exception):
        status_code = 404

    with pytest.raises(CustomHTTPError):
        with instrument_request(endpoint="/api/v1/family/unknown", method="GET"):
            raise CustomHTTPError("Not found")

    assert metrics.get_counter("http_errors_total") >= 1


def test_ai_calls_instrumentation():
    initial_count = metrics.get_counter("ai_calls_total")
    with instrument_ai_call(model="claude-3-5-sonnet", task="summarize_health"):
        time.sleep(0.005)

    assert metrics.get_counter("ai_calls_total") == initial_count + 1
    obs = metrics.get_observations("ai_call_duration_seconds")
    assert len(obs) >= 1
    assert obs[-1] >= 0.004


def test_fhir_calls_instrumentation():
    initial_count = metrics.get_counter("fhir_calls_total")
    with instrument_fhir_call(resource_type="MedicationRequest", operation="search"):
        time.sleep(0.005)

    assert metrics.get_counter("fhir_calls_total") == initial_count + 1
    obs = metrics.get_observations("fhir_call_duration_seconds")
    assert len(obs) >= 1
    assert obs[-1] >= 0.004


def test_filenest_calls_instrumentation():
    initial_count = metrics.get_counter("filenest_calls_total")
    with instrument_filenest_call(operation="upload"):
        time.sleep(0.005)

    assert metrics.get_counter("filenest_calls_total") == initial_count + 1
    obs = metrics.get_observations("filenest_call_duration_seconds")
    assert len(obs) >= 1


def test_database_latency_instrumentation():
    initial_count = metrics.get_counter("db_queries_total")
    with instrument_db_query(query_type="select_care_circle"):
        time.sleep(0.005)

    assert metrics.get_counter("db_queries_total") == initial_count + 1
    obs = metrics.get_observations("db_query_duration_seconds")
    assert len(obs) >= 1


def test_event_processing_instrumentation():
    initial_count = metrics.get_counter("events_processed_total")
    with instrument_event_processing(event_type="health_document_uploaded"):
        time.sleep(0.005)

    assert metrics.get_counter("events_processed_total") == initial_count + 1
    obs = metrics.get_observations("event_processing_duration_seconds")
    assert len(obs) >= 1


def test_notification_delivery_instrumentation():
    initial_count = metrics.get_counter("notifications_delivered_total")
    with instrument_notification_delivery(channel="fcm_push"):
        time.sleep(0.005)

    assert metrics.get_counter("notifications_delivered_total") == initial_count + 1
    obs = metrics.get_observations("notification_delivery_duration_seconds")
    assert len(obs) >= 1


def test_insight_generation_instrumentation():
    initial_count = metrics.get_counter("insights_generated_total")
    with instrument_insight_generation(insight_type="vital_trends"):
        time.sleep(0.005)

    assert metrics.get_counter("insights_generated_total") == initial_count + 1
    obs = metrics.get_observations("insight_generation_duration_seconds")
    assert len(obs) >= 1


def test_prometheus_exposition_format():
    prom_text = metrics.export_prometheus()
    assert "# TYPE http_requests_total counter" in prom_text
    assert "# TYPE ai_calls_total counter" in prom_text
    assert "# TYPE fhir_calls_total counter" in prom_text
    assert "# TYPE filenest_calls_total counter" in prom_text
    assert "# TYPE db_queries_total counter" in prom_text
    assert "# TYPE events_processed_total counter" in prom_text
    assert "# TYPE notifications_delivered_total counter" in prom_text
    assert "# TYPE insights_generated_total counter" in prom_text
    assert "http_request_duration_seconds_count" in prom_text
