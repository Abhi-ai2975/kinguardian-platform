"""
Domain layer — Event entity.

This module defines the canonical Event model used throughout the worker.
It mirrors the Go gateway's domain.Event struct so both services speak the
same language when passing events through Redis Streams.

Zero external I/O — only pydantic for validation. No Redis, no ClickHouse.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
import json

from pydantic import BaseModel, Field, field_validator


class EventType(str, Enum):
    """
    Classifies the kind of telemetry event.
    Maps directly to the Redis Stream topic and ClickHouse event_type column.
    """
    AUDIT = "audit"
    LOG = "log"
    METRIC = "metric"
    TRACE = "trace"
    SECURITY = "security"
    FRONTEND = "frontend"
    AI = "ai"
    SYSTEM = "system"
    INFRASTRUCTURE = "infrastructure"


class Severity(str, Enum):
    """
    Importance level of an event, from least to most critical.
    Stored as a LowCardinality(String) in ClickHouse for fast filtering.
    """
    DEBUG = "debug"
    INFO = "info"
    WARN = "warn"
    ERROR = "error"
    CRITICAL = "critical"


class Event(BaseModel):
    """
    The canonical telemetry event flowing through the worker pipeline.

    Events arrive as flat string maps from Redis Streams (published by the
    Go Gateway) and are parsed into this model before being written to
    ClickHouse. All fields match the ClickHouse `watcher.events` schema.
    """

    # Routing — who owns this event
    organization_id: str
    application_id: str = ""
    environment: str = ""

    # Classification
    event_type: EventType
    severity: Severity

    # Content
    message: str

    # Source — set by the gateway based on the API key type, never by the SDK.
    # "client" = public token (wpub_) used from browser, mobile, or desktop.
    # "server" = secret key (wt_) used from a server-side SDK.
    # ""       = legacy events ingested before source tagging was introduced.
    source: str = ""

    # ServiceName is an optional developer-set label for the sending component.
    # Set at SDK init time (e.g. "payment-api", "ai-agent", "mobile-ios").
    # Sent as X-Service-Name header — stored verbatim, never validated.
    service_name: str = ""

    # Timestamps — both always present, ingested_at is server-set by gateway
    timestamp: datetime
    ingested_at: datetime

    # Distributed tracing — optional
    trace_id: str = ""
    span_id: str = ""
    parent_span_id: str = ""

    # Actor
    user_id: str = ""
    session_id: str = ""

    # Arbitrary event-specific data — stored as JSON string in ClickHouse
    payload: str = Field(default="{}")

    # Gateway-added metadata
    ip_address: str = ""
    sdk_version: str = ""
    runtime: str = ""
    region: str = ""

    @field_validator("payload", mode="before")
    @classmethod
    def coerce_payload(cls, v: Any) -> str:
        """
        Accepts either a JSON string or a dict and normalizes to a JSON string.
        Redis Streams store everything as strings, but the gateway may also
        pass a dict directly in tests — handle both.
        """
        if isinstance(v, dict):
            return json.dumps(v)
        if v is None or v == "":
            return "{}"
        return str(v)

    @classmethod
    def from_stream_fields(cls, fields: dict[str, str]) -> "Event":
        """
        Deserializes a flat Redis Stream message (all string values) into
        an Event domain object. Redis Streams store everything as bytes/strings,
        so this is the canonical entry point for converting stream data.
        """
        return cls.model_validate(fields)

    def to_clickhouse_row(self) -> tuple:
        """
        Returns the event as a tuple in the exact column order expected by
        the ClickHouse `watcher.events` table INSERT statement.

        Column order must match the INSERT in clickhouse_adapter/repository.py.
        """
        return (
            self.organization_id,
            self.application_id,
            self.environment,
            self.event_type.value,
            self.severity.value,
            self.message,
            self.source,
            self.service_name,
            self.timestamp,
            self.trace_id,
            self.span_id,
            self.parent_span_id,
            self.user_id,
            self.session_id,
            self.payload,
            self.ingested_at,
            self.sdk_version,
            self.runtime,
            self.ip_address,
            self.region,
        )
