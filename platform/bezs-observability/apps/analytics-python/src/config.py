"""
Configuration loader for the analytics worker.

Reads all settings from environment variables with sensible defaults
for local development. In production, variables are set by the container
runtime — the .env file is only used locally.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv


@dataclass
class Config:
    """
    All runtime configuration for the analytics worker.
    Each field maps to one environment variable (documented in docs/configuration.md).
    """

    # Redis — queue layer
    redis_url: str = "redis://localhost:6379"

    # ClickHouse — telemetry storage
    clickhouse_host: str = "localhost"
    clickhouse_port: int = 8123
    clickhouse_db: str = "watcher"
    clickhouse_user: str = "watcher"
    clickhouse_password: str = "watcher_secret"

    # Worker behaviour
    batch_size: int = 100     # events per XREADGROUP call
    block_ms: int = 2000      # milliseconds to block when stream is empty

    # Which workers to run — comma-separated list
    # e.g. "audit,log,trace,metric,ai"
    workers: list[str] = field(default_factory=lambda: ["audit", "log", "trace", "metric", "ai"])

    # IAM service — used by the retention scheduler to fetch per-org retention windows.
    # The scheduler calls GET /api/internal/orgs/retention with x-internal-secret.
    iam_base_url: str = "http://localhost:3001"
    iam_internal_secret: str = ""

    # Retention scheduler — how often to run the data purge pass (seconds).
    # Default: 86400 (24 hours). Lower values are useful in dev/testing.
    retention_interval_seconds: int = 86400


def load_config() -> Config:
    """
    Loads config from environment, falling back to .env at the project root.
    Returns a fully populated Config instance.
    """
    # Try project root .env for local dev; silently ignored in production.
    load_dotenv(dotenv_path="../../.env")

    workers_raw = os.getenv("WORKERS", "audit,log,trace,metric,ai")
    workers = [w.strip() for w in workers_raw.split(",") if w.strip()]

    return Config(
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379"),
        clickhouse_host=os.getenv("CLICKHOUSE_HOST", "localhost"),
        clickhouse_port=int(os.getenv("CLICKHOUSE_HTTP_PORT", "8123")),
        clickhouse_db=os.getenv("CLICKHOUSE_DB", "watcher"),
        clickhouse_user=os.getenv("CLICKHOUSE_USER", "watcher"),
        clickhouse_password=os.getenv("CLICKHOUSE_PASSWORD", "watcher_secret"),
        batch_size=int(os.getenv("WORKER_BATCH_SIZE", "100")),
        block_ms=int(os.getenv("WORKER_BLOCK_MS", "2000")),
        workers=workers,
        iam_base_url=os.getenv("IAM_BASE_URL", "http://localhost:3001"),
        iam_internal_secret=os.getenv("IAM_INTERNAL_SECRET", ""),
        retention_interval_seconds=int(os.getenv("RETENTION_INTERVAL_SECONDS", "86400")),
    )
