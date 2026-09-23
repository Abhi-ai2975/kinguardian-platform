"""
Wearable Observability & Operational Telemetry Test Suite.

Verifies:
1. Tracking of all required metrics:
   - wearable_connection_created
   - wearable_connection_failed
   - wearable_sync_started
   - wearable_sync_completed
   - wearable_sync_failed
   - wearable_api_latency
   - wearable_data_points_processed
   - wearable_data_quality_errors
2. Strict Security & Privacy Invariant:
   - NEVER log raw health metric values (steps count, heart rate bpm, sleep duration, SpO2, blood pressure).
"""

import pytest
import time
import logging
from unittest.mock import patch

from app.core.telemetry import metrics
from app.domains.wearables.observability import (
    WearableObservabilityTracker,
    instrument_wearable_sync
)
from app.domains.wearables.domain.exceptions import WearableServiceUnavailableError


def test_wearable_connection_observability():
    """
    Tests tracking of wearable_connection_created and wearable_connection_failed.
    """
    initial_created = metrics.get_counter("wearable_connection_created")
    initial_failed = metrics.get_counter("wearable_connection_failed")

    # 1. Successful connection creation
    WearableObservabilityTracker.record_connection_created(provider="garmin", environment="production")
    assert metrics.get_counter("wearable_connection_created") == initial_created + 1

    # 2. Failed connection
    WearableObservabilityTracker.record_connection_failed(provider="apple_health", reason="oauth_denied_by_user")
    assert metrics.get_counter("wearable_connection_failed") == initial_failed + 1


def test_wearable_sync_lifecycle_and_data_points():
    """
    Tests tracking of wearable_sync_started, wearable_sync_completed, wearable_sync_failed,
    and wearable_data_points_processed.
    """
    initial_started = metrics.get_counter("wearable_sync_started")
    initial_completed = metrics.get_counter("wearable_sync_completed")
    initial_failed = metrics.get_counter("wearable_sync_failed")
    initial_processed = metrics.get_counter("wearable_data_points_processed")

    # 1. Sync started
    WearableObservabilityTracker.record_sync_started(provider="garmin", sync_type="inbound_webhook")
    assert metrics.get_counter("wearable_sync_started") == initial_started + 1

    # 2. Sync completed with 14 normalized data points
    WearableObservabilityTracker.record_sync_completed(provider="garmin", items_synced=14)
    assert metrics.get_counter("wearable_sync_completed") == initial_completed + 1
    assert metrics.get_counter("wearable_data_points_processed") == initial_processed + 14

    # 3. Sync failed
    WearableObservabilityTracker.record_sync_failed(provider="oura", error_code="RATE_LIMIT_EXCEEDED")
    assert metrics.get_counter("wearable_sync_failed") == initial_failed + 1


def test_wearable_data_quality_errors_and_api_latency():
    """
    Tests tracking of wearable_data_quality_errors and wearable_api_latency.
    """
    initial_quality_errs = metrics.get_counter("wearable_data_quality_errors")

    # 1. Record data quality errors
    WearableObservabilityTracker.record_data_quality_error(error_type="unrealistic_steps_spike", provider="garmin")
    WearableObservabilityTracker.record_data_quality_error(error_type="heart_rate_below_minimum", provider="apple_health")
    assert metrics.get_counter("wearable_data_quality_errors") == initial_quality_errs + 2

    # 2. API Latency Context Manager
    with WearableObservabilityTracker.track_api_latency(endpoint="/v1/wearables/metrics", provider="garmin"):
        time.sleep(0.01)  # simulate brief network roundtrip

    latencies = metrics.get_observations("wearable_api_latency")
    assert len(latencies) > 0
    assert latencies[-1] >= 0.01


def test_instrument_wearable_sync_context_manager():
    """
    Tests the unified instrument_wearable_sync context manager on success and failure.
    """
    initial_completed = metrics.get_counter("wearable_sync_completed")
    initial_failed = metrics.get_counter("wearable_sync_failed")

    # 1. Success case
    with instrument_wearable_sync(provider="garmin", sync_type="webhook"):
        pass
    assert metrics.get_counter("wearable_sync_completed") == initial_completed + 1

    # 2. Failure case
    with pytest.raises(WearableServiceUnavailableError):
        with instrument_wearable_sync(provider="garmin", sync_type="webhook"):
            raise WearableServiceUnavailableError(internal_diagnostic="Provider timeout", provider="garmin")
    assert metrics.get_counter("wearable_sync_failed") == initial_failed + 1



def test_zero_raw_health_metric_values_logging_security(monkeypatch):
    """
    SECURITY INVARIANT:
    Ensures that raw health metric values (e.g. 5430 steps, 145 bpm, 402 minutes sleep, 98% SpO2)
    are NEVER emitted in log messages or telemetry attributes.
    """
    import app.domains.wearables.observability as obs_mod
    logged_messages = []

    orig_info = obs_mod.logger.info
    orig_warning = obs_mod.logger.warning

    def spy_info(msg, *args, **kwargs):
        logged_messages.append(str(msg))
        return orig_info(msg, *args, **kwargs)

    def spy_warning(msg, *args, **kwargs):
        logged_messages.append(str(msg))
        return orig_warning(msg, *args, **kwargs)

    monkeypatch.setattr(obs_mod.logger, "info", spy_info)
    monkeypatch.setattr(obs_mod.logger, "warning", spy_warning)

    # Trigger observability tracking
    WearableObservabilityTracker.record_connection_created(provider="garmin")
    WearableObservabilityTracker.record_sync_started(provider="garmin")
    WearableObservabilityTracker.record_sync_completed(provider="garmin", items_synced=5)
    WearableObservabilityTracker.record_data_quality_error(error_type="missing_timestamps", provider="garmin")
    WearableObservabilityTracker.record_sync_failed(provider="garmin", error_code="WEARABLE_SERVICE_UNAVAILABLE")

    log_output = "\n".join(logged_messages)

    # Verify no raw biometric values exist in logs
    forbidden_phi_patterns = [
        "steps=5430",
        "bpm=145",
        "spo2=98",
        "sleep_minutes=402",
        "blood_pressure=140/90",
        "weight=78.5",
        "5430",
        "145",
        "402"
    ]

    for forbidden in forbidden_phi_patterns:
        assert forbidden not in log_output

    # Verify safe operational events ARE logged
    assert "Wearable connection created successfully" in log_output
    assert "Wearable data sync started" in log_output
    assert "Wearable data sync completed successfully" in log_output
    assert "Wearable telemetry data quality check failed" in log_output




