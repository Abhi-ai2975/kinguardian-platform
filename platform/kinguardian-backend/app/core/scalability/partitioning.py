"""
Scalability & Partitioning Strategy:
Designed for high-scale Modular Monolith handling:
- 10,000 families
- 50,000 users
- 100,000 care subjects
- Millions of health events, notifications, and audit logs

Implements time-range table partitioning DDL helpers and partition maintenance.
"""

from typing import List, Dict, Any
from datetime import datetime, timezone
import calendar


class TablePartitionManager:
    """
    Manages range-based monthly partitioning for high-volume append-only tables:
    1. event_logs (Audit trail)
    2. outbox_events (Transactional outbox)
    3. notifications & notification_deliveries
    4. medication_adherence_events
    5. wellbeing_checkins
    """

    PARTITIONED_TABLES: List[str] = [
        "event_logs",
        "outbox_events",
        "notifications",
        "notification_deliveries",
        "medication_adherence_events",
        "wellbeing_checkins"
    ]

    @classmethod
    def generate_monthly_partition_ddl(cls, table_name: str, year: int, month: int) -> str:
        """
        Generates PostgreSQL DDL for creating a monthly partition table.
        Example: event_logs_y2026m08 FOR VALUES FROM ('2026-08-01') TO ('2026-09-01')
        """
        partition_name = f"{table_name}_y{year}m{month:02d}"
        start_date = f"{year}-{month:02d}-01"
        
        # Calculate next month start
        if month == 12:
            next_year = year + 1
            next_month = 1
        else:
            next_year = year
            next_month = month + 1
        end_date = f"{next_year}-{next_month:02d}-01"

        return (
            f"CREATE TABLE IF NOT EXISTS {partition_name} "
            f"PARTITION OF {table_name} "
            f"FOR VALUES FROM ('{start_date}') TO ('{end_date}');"
        )

    @classmethod
    def generate_partition_maintenance_plan(cls, start_year: int = 2026, months_ahead: int = 12) -> List[str]:
        """
        Pre-generates DDL statements for all high-volume tables over a rolling window.
        """
        ddl_statements = []
        current_year = start_year
        current_month = 1

        for _ in range(months_ahead):
            for table in cls.PARTITIONED_TABLES:
                ddl_statements.append(
                    cls.generate_monthly_partition_ddl(table, current_year, current_month)
                )
            if current_month == 12:
                current_year += 1
                current_month = 1
            else:
                current_month += 1

        return ddl_statements
