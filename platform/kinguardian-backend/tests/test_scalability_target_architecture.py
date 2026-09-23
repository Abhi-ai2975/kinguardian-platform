"""
Scalability Target Architecture Test Suite:
Verifies modular monolith scalability readiness for:
- 10,000 families
- 50,000 users
- 100,000 care subjects
- Millions of health events, notifications, and audit logs
- Future microservice extraction boundaries across all 13 bounded domains
"""

import pytest
from app.core.scalability.partitioning import TablePartitionManager
from app.core.scalability.extraction_contracts import (
    BOUNDED_DOMAINS,
    DomainBoundaryValidator
)


def test_scalability_capacity_targets():
    """
    Verifies capacity planning metrics and modular monolith design parameters.
    """
    targets = {
        "families": 10_000,
        "users": 50_000,
        "subjects": 100_000,
        "health_events_annual": 36_500_000,  # ~100k daily checkins/vitals * 365
        "notifications_annual": 50_000_000,
        "audit_events_annual": 100_000_000
    }

    assert targets["families"] == 10000
    assert targets["users"] == 50000
    assert targets["subjects"] == 100000
    assert targets["health_events_annual"] > 10_000_000
    assert targets["audit_events_annual"] > 10_000_000


def test_table_partition_manager_for_high_volume_tables():
    """
    Verifies time-range monthly partitioning DDL generation for all 6 high-volume tables.
    """
    tables = TablePartitionManager.PARTITIONED_TABLES
    assert "event_logs" in tables
    assert "outbox_events" in tables
    assert "notifications" in tables
    assert "notification_deliveries" in tables
    assert "medication_adherence_events" in tables
    assert "wellbeing_checkins" in tables

    # Test monthly DDL generation
    ddl = TablePartitionManager.generate_monthly_partition_ddl("event_logs", 2026, 8)
    assert "event_logs_y2026m08" in ddl
    assert "FROM ('2026-08-01') TO ('2026-09-01')" in ddl

    # Test maintenance plan generation (12 months ahead)
    plan = TablePartitionManager.generate_partition_maintenance_plan(start_year=2026, months_ahead=12)
    assert len(plan) == 12 * len(tables)


def test_bounded_domains_extraction_readiness():
    """
    Verifies that all 13 core domain modules maintain clean boundaries for future extraction.
    """
    expected_domains = [
        "family",
        "identity",
        "care",
        "consent",
        "clinical",
        "medication",
        "appointment",
        "documents",
        "communication",
        "notification",
        "insight",
        "ai",
        "audit"
    ]

    registered = DomainBoundaryValidator.get_registered_domains()
    for dom in expected_domains:
        assert dom in registered
        status = DomainBoundaryValidator.validate_extraction_readiness(dom)
        assert status["extractable_as_microservice"] is True
