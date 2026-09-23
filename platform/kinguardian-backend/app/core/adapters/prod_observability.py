"""
Production Observability Gateway.
Exports structured events, trace spans, and metric counters to OpenTelemetry OTLP
collector endpoints (watcher24 / bezs-observability).
"""

import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ObservabilityGateway:
    """
    Production Observability Gateway.
    Transmits distributed trace spans and telemetry batches to OpenTelemetry collectors.
    """

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        timeout: float = 3.0
    ):
        self.endpoint_url = (endpoint_url or settings.OBSERVABILITY_URL).rstrip("/")
        self.timeout = timeout

    async def emit_span(
        self,
        name: str,
        trace_id: str,
        span_id: str,
        parent_span_id: Optional[str] = None,
        attributes: Optional[Dict[str, Any]] = None,
        duration_ms: float = 0.0
    ) -> bool:
        payload = {
            "name": name,
            "trace_id": trace_id,
            "span_id": span_id,
            "parent_span_id": parent_span_id,
            "attributes": attributes or {},
            "duration_ms": duration_ms,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(
                    f"{self.endpoint_url}/v1/traces",
                    json=payload,
                    timeout=self.timeout
                )
                return res.status_code in (200, 202)
            except Exception as e:
                logger.debug(f"ObservabilityGateway: emit_span background send failed: {e}")
                return False

    async def emit_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "count",
        labels: Optional[Dict[str, str]] = None
    ) -> bool:
        payload = {
            "metric_name": metric_name,
            "value": value,
            "unit": unit,
            "labels": labels or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        async with httpx.AsyncClient() as client:
            try:
                res = await client.post(
                    f"{self.endpoint_url}/v1/metrics",
                    json=payload,
                    timeout=self.timeout
                )
                return res.status_code in (200, 202)
            except Exception as e:
                logger.debug(f"ObservabilityGateway: emit_metric background send failed: {e}")
                return False
