"""
Wearable Observability & Operational Telemetry Module.

Tracks all required wearable operational and reliability metrics:
- wearable_connection_created
- wearable_connection_failed
- wearable_sync_started
- wearable_sync_completed
- wearable_sync_failed
- wearable_api_latency
- wearable_data_points_processed
- wearable_data_quality_errors

STRICT SECURITY & PRIVACY INVARIANT:
NEVER log raw health metric values (e.g. steps count, heart rate bpm, sleep duration, SpO2, blood pressure).
Only operational metadata, provider tags, sanitized error codes, latencies, and item counts are recorded.
"""

import time
from typing import Dict, Any, Optional, List
from contextlib import contextmanager
from app.core.telemetry import metrics, MetricsCollector
from app.core.logging import get_logger

logger = get_logger(__name__)


class WearableObservabilityTracker:
    """
    Dedicated tracker for wearable integration reliability, sync cycles, and data pipeline quality.
    Ensures ZERO raw health metric values (steps, bpm, hours, SpO2) are ever emitted to telemetry or logs.
    """

    # 1. Connection Lifecycle
    @classmethod
    def record_connection_created(cls, provider: str, environment: str = "production") -> None:
        metrics.increment(
            "wearable_connection_created",
            1,
            {"provider": provider.lower(), "environment": environment}
        )
        logger.info(
            "Wearable connection created successfully",
            extra={"provider": provider.lower(), "event": "wearable_connection_created"}
        )

    @classmethod
    def record_connection_failed(cls, provider: str, reason: str = "unknown") -> None:
        sanitized_reason = reason.replace("\n", " ")[:100]
        metrics.increment(
            "wearable_connection_failed",
            1,
            {"provider": provider.lower(), "reason": sanitized_reason}
        )
        logger.warning(
            "Wearable connection initiation/callback failed",
            extra={"provider": provider.lower(), "reason": sanitized_reason, "event": "wearable_connection_failed"}
        )

    # 2. Sync Lifecycle
    @classmethod
    def record_sync_started(cls, provider: str, sync_type: str = "webhook") -> None:
        metrics.increment(
            "wearable_sync_started",
            1,
            {"provider": provider.lower(), "sync_type": sync_type}
        )
        logger.info(
            "Wearable data sync started",
            extra={"provider": provider.lower(), "sync_type": sync_type, "event": "wearable_sync_started"}
        )

    @classmethod
    def record_sync_completed(cls, provider: str, items_synced: int = 0) -> None:
        metrics.increment(
            "wearable_sync_completed",
            1,
            {"provider": provider.lower()}
        )
        if items_synced > 0:
            cls.record_data_points_processed(items_synced, provider=provider)
        logger.info(
            "Wearable data sync completed successfully",
            extra={"provider": provider.lower(), "items_count": items_synced, "event": "wearable_sync_completed"}
        )

    @classmethod
    def record_sync_failed(cls, provider: str, error_code: str = "WEARABLE_SERVICE_UNAVAILABLE") -> None:
        metrics.increment(
            "wearable_sync_failed",
            1,
            {"provider": provider.lower(), "error_code": error_code}
        )
        logger.error(
            "Wearable data sync cycle failed",
            extra={"provider": provider.lower(), "error_code": error_code, "event": "wearable_sync_failed"}
        )

    # 3. Processed Data Points
    @classmethod
    def record_data_points_processed(cls, count: int, provider: str = "unknown") -> None:
        if count <= 0:
            return
        metrics.increment(
            "wearable_data_points_processed",
            count,
            {"provider": provider.lower()}
        )
        # Note: ONLY log count, NEVER raw metric values (steps, bpm, SpO2)
        logger.debug(
            "Processed normalized wearable data points",
            extra={"provider": provider.lower(), "data_points_count": count, "event": "wearable_data_points_processed"}
        )

    # 4. Data Quality Errors
    @classmethod
    def record_data_quality_error(cls, error_type: str, provider: str = "unknown") -> None:
        metrics.increment(
            "wearable_data_quality_errors",
            1,
            {"error_type": error_type.lower(), "provider": provider.lower()}
        )
        logger.warning(
            "Wearable telemetry data quality check failed",
            extra={"error_type": error_type.lower(), "provider": provider.lower(), "event": "wearable_data_quality_errors"}
        )

    # 5. API Latency Context Manager
    @classmethod
    @contextmanager
    def track_api_latency(cls, endpoint: str, provider: str = "gateway"):
        start = time.perf_counter()
        try:
            yield
        finally:
            elapsed = time.perf_counter() - start
            metrics.observe(
                "wearable_api_latency",
                elapsed,
                {"endpoint": endpoint, "provider": provider.lower()}
            )


@contextmanager
def instrument_wearable_sync(provider: str, sync_type: str = "webhook"):
    """
    Context manager that automatically tracks sync lifecycle (started, completed, or failed)
    and execution latency without logging any PHI or raw metric values.
    """
    WearableObservabilityTracker.record_sync_started(provider, sync_type=sync_type)
    start = time.perf_counter()
    try:
        yield
        WearableObservabilityTracker.record_sync_completed(provider)
    except Exception as exc:
        error_code = getattr(exc, "error_code", "WEARABLE_SERVICE_UNAVAILABLE")
        WearableObservabilityTracker.record_sync_failed(provider, error_code=str(error_code))
        raise
    finally:
        elapsed = time.perf_counter() - start
        metrics.observe(
            "wearable_api_latency",
            elapsed,
            {"endpoint": f"sync_{sync_type}", "provider": provider.lower()}
        )
