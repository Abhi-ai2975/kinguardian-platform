"""
Use case — PurgeExpiredEventsUseCase.

Fetches each org's retention window from the IAM service, then deletes
ClickHouse events that exceed that window.

This use case runs nightly (called by the RetentionScheduler). It must not
be called on the hot ingest path — ClickHouse mutations are expensive and
asynchronous.

Depends only on the RetentionRepository port and HTTP — never imports
ClickHouse or Postgres directly. The composition root injects the real adapter.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx

from src.ports.retention import RetentionRepository

logger = logging.getLogger(__name__)


@dataclass
class OrgRetention:
    """Retention window returned by IAM for a single organisation."""

    org_id: str
    plan: str
    retention_days: int


class PurgeExpiredEventsUseCase:
    """
    Orchestrates nightly data retention across all organisations.

    1. Calls GET /api/internal/orgs/retention on the IAM service to get
       each org's plan and retention window.
    2. For each org, computes the cutoff timestamp and tells the
       RetentionRepository to delete events older than that cutoff.

    The IAM call is the authoritative source of retention windows — this
    use case never hardcodes plan names or retention days so that changes
    to the plan structure only need updating in IAM.
    """

    def __init__(
        self,
        retention_repo: RetentionRepository,
        iam_base_url: str,
        iam_internal_secret: str,
    ) -> None:
        """
        Args:
            retention_repo: Port for deleting old events from ClickHouse.
            iam_base_url: Base URL of the IAM service (e.g. http://iam:3001).
            iam_internal_secret: Shared secret sent as x-internal-secret header.
        """
        self._repo = retention_repo
        self._iam_base_url = iam_base_url.rstrip("/")
        self._iam_secret = iam_internal_secret

    def execute(self) -> tuple[int, int]:
        """
        Runs one full retention pass across all orgs.

        Returns:
            (purged_count, error_count) — number of orgs successfully purged
            and number of orgs that failed (logged but not re-raised so a
            single broken org doesn't abort the whole pass).
        """
        orgs = self._fetch_org_retentions()
        if not orgs:
            logger.warning("purge-expired-events: IAM returned no orgs — skipping pass")
            return 0, 0

        now = datetime.now(tz=timezone.utc)
        purged = 0
        errors = 0

        for org in orgs:
            cutoff = now - timedelta(days=org.retention_days)
            try:
                self._repo.purge_before(org.org_id, cutoff)
                purged += 1
            except Exception as exc:
                logger.error(
                    "purge-expired-events: failed for org=%s plan=%s: %s",
                    org.org_id,
                    org.plan,
                    exc,
                )
                errors += 1

        logger.info(
            "purge-expired-events: pass complete — purged=%d errors=%d",
            purged,
            errors,
        )
        return purged, errors

    def _fetch_org_retentions(self) -> list[OrgRetention]:
        """
        Calls the IAM internal endpoint to get org retention windows.
        Returns an empty list on any network or parse error (logged).
        """
        url = f"{self._iam_base_url}/api/internal/orgs/retention"
        headers = {"x-internal-secret": self._iam_secret}

        try:
            resp = httpx.get(url, headers=headers, timeout=30)
            resp.raise_for_status()
            payload = resp.json()
        except Exception as exc:
            logger.error("purge-expired-events: failed to fetch org retentions from IAM: %s", exc)
            return []

        return [
            OrgRetention(
                org_id=item["orgId"],
                plan=item["plan"],
                retention_days=item["retentionDays"],
            )
            for item in payload.get("orgs", [])
        ]
