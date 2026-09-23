"""
Adapter — ClickHouse retention repository implementing the RetentionRepository port.

Uses ALTER TABLE … DELETE (a lightweight mutation) to purge rows per org
whose timestamp has exceeded the plan's retention window.

ALTER TABLE … DELETE is asynchronous in ClickHouse — it schedules a mutation
that runs during the next MergeTree merge. Rows are not instantly gone, but
they will be cleaned up. This is the correct approach for background retention;
do NOT use it on the hot ingest path.
"""

from __future__ import annotations

import logging
from datetime import datetime

from clickhouse_connect.driver.client import Client

from src.ports.retention import RetentionRepository

logger = logging.getLogger(__name__)


class ClickHouseRetentionRepository(RetentionRepository):
    """
    Implements RetentionRepository by issuing ALTER TABLE … DELETE mutations
    against the watcher.events table in ClickHouse.

    Each mutation targets a single org so that one org's retention window
    does not affect another org's data in the same query.
    """

    def __init__(self, client: Client) -> None:
        """
        Args:
            client: A connected clickhouse-connect Client instance.
                    The retention scheduler owns this client exclusively —
                    clickhouse-connect is not thread-safe across instances.
        """
        self._client = client

    def purge_before(self, org_id: str, cutoff: datetime) -> None:
        """
        Issues a ClickHouse mutation that deletes all events for `org_id`
        with a timestamp strictly before `cutoff`.

        The mutation is asynchronous — rows will be removed on the next
        MergeTree merge cycle, not immediately.
        """
        # Use parameterised query to prevent injection via org_id.
        # ClickHouse parameter syntax: {name:Type}
        self._client.command(
            "ALTER TABLE watcher.events DELETE"
            " WHERE organization_id = {org_id:String}"
            " AND timestamp < {cutoff:DateTime}",
            parameters={"org_id": org_id, "cutoff": cutoff},
        )
        logger.info(
            "retention: scheduled purge for org=%s before=%s",
            org_id,
            cutoff.isoformat(),
        )
