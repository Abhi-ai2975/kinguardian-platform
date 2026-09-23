"""
Unit tests for the Event domain model.
Tests parsing, validation, coercion, and ClickHouse row serialization.
No external dependencies — pure in-memory tests.
"""

import json
from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from src.domain.event import Event, EventType, Severity


# ── Helpers ──────────────────────────────────────────────────────────────────

def make_stream_fields(**overrides) -> dict[str, str]:
    """Returns minimal valid stream fields with optional overrides."""
    base = {
        "organization_id": "org_test",
        "application_id": "billing-api",
        "environment": "production",
        "event_type": "audit",
        "severity": "info",
        "message": "user logged in",
        "timestamp": "2026-05-25T10:00:00+00:00",
        "ingested_at": "2026-05-25T10:00:01+00:00",
    }
    base.update(overrides)
    return base


# ── EventType tests ───────────────────────────────────────────────────────────

def test_event_type_all_values_are_valid():
    valid = ["audit", "log", "metric", "trace", "security", "frontend", "ai", "system", "infrastructure"]
    for v in valid:
        assert EventType(v) is not None


def test_event_type_invalid_raises():
    with pytest.raises(ValueError):
        EventType("not_a_type")


# ── Severity tests ────────────────────────────────────────────────────────────

def test_severity_all_values_are_valid():
    valid = ["debug", "info", "warn", "error", "critical"]
    for v in valid:
        assert Severity(v) is not None


def test_severity_invalid_raises():
    with pytest.raises(ValueError):
        Severity("WARNING")


# ── Event.from_stream_fields ──────────────────────────────────────────────────

def test_from_stream_fields_valid_parses_correctly():
    fields = make_stream_fields()
    event = Event.from_stream_fields(fields)

    assert event.organization_id == "org_test"
    assert event.event_type == EventType.AUDIT
    assert event.severity == Severity.INFO
    assert event.message == "user logged in"


def test_from_stream_fields_missing_org_id_raises():
    fields = make_stream_fields()
    del fields["organization_id"]
    with pytest.raises(ValidationError):
        Event.from_stream_fields(fields)


def test_from_stream_fields_invalid_event_type_raises():
    fields = make_stream_fields(event_type="not_a_type")
    with pytest.raises(ValidationError):
        Event.from_stream_fields(fields)


def test_from_stream_fields_invalid_severity_raises():
    fields = make_stream_fields(severity="LOUD")
    with pytest.raises(ValidationError):
        Event.from_stream_fields(fields)


def test_from_stream_fields_optional_fields_default_to_empty():
    fields = make_stream_fields()
    event = Event.from_stream_fields(fields)

    assert event.trace_id == ""
    assert event.user_id == ""
    assert event.ip_address == ""
    assert event.payload == "{}"


def test_from_stream_fields_payload_dict_coerced_to_json_string():
    """Payload as a dict (from tests) should be stored as a JSON string."""
    fields = make_stream_fields(payload={"patient_id": "p_001"})
    event = Event.from_stream_fields(fields)

    parsed = json.loads(event.payload)
    assert parsed == {"patient_id": "p_001"}


def test_from_stream_fields_payload_none_defaults_to_empty_json():
    fields = make_stream_fields(payload=None)
    event = Event.from_stream_fields(fields)
    assert event.payload == "{}"


# ── Event.to_clickhouse_row ───────────────────────────────────────────────────

def test_to_clickhouse_row_returns_tuple():
    event = Event.from_stream_fields(make_stream_fields())
    row = event.to_clickhouse_row()
    assert isinstance(row, tuple)


def test_to_clickhouse_row_first_element_is_org_id():
    event = Event.from_stream_fields(make_stream_fields(organization_id="org_xyz"))
    row = event.to_clickhouse_row()
    assert row[0] == "org_xyz"


def test_to_clickhouse_row_event_type_is_string_value():
    """ClickHouse expects the string value, not the enum object."""
    event = Event.from_stream_fields(make_stream_fields(event_type="audit"))
    row = event.to_clickhouse_row()
    # event_type is column index 3
    assert row[3] == "audit"
    assert isinstance(row[3], str)
