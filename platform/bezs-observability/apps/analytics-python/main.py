"""
main.py — Composition root for the analytics worker service.

This is the ONLY place where concrete implementations are instantiated
and injected into use cases and workers. All other layers depend only
on port interfaces — this file wires the real adapters to those interfaces.

Startup order:
  1. Load config from environment
  2. Connect to Redis and ClickHouse
  3. Create adapters (implement ports)
  4. Create use cases (inject adapters via port interfaces)
  5. Create workers (inject consumers + use cases)
  6. Start retention scheduler (periodic purge of expired events)
  7. Block until workers exit
"""

from __future__ import annotations

import logging
import os
import socket
import threading

import clickhouse_connect
import redis

from src.adapters.clickhouse_adapter.repository import ClickHouseEventRepository
from src.adapters.clickhouse_adapter.retention import ClickHouseRetentionRepository
from src.adapters.redis_adapter.consumer import RedisStreamConsumer
from src.config import load_config
from src.usecases.process_batch import ProcessBatchUseCase
from src.usecases.purge_expired_events import PurgeExpiredEventsUseCase
from src.workers.ai_worker import AIWorker
from src.workers.audit_worker import AuditWorker
from src.workers.log_worker import LogWorker
from src.workers.metric_worker import MetricWorker
from src.workers.retention_scheduler import RetentionScheduler
from src.workers.trace_worker import TraceWorker

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("main")

# Maps worker name strings (from WORKERS env var) to their worker classes.
WORKER_REGISTRY = {
    "audit": AuditWorker,
    "log": LogWorker,
    "trace": TraceWorker,
    "metric": MetricWorker,
    "ai": AIWorker,
}


def main() -> None:
    # ── 1. Load configuration ─────────────────────────────────────────────────
    cfg = load_config()
    logger.info("analytics-worker: starting, workers=%s", cfg.workers)

    # ── 2. Connect to infrastructure ─────────────────────────────────────────
    # Redis — used to consume events from streams
    redis_client = redis.from_url(cfg.redis_url, decode_responses=False)
    try:
        redis_client.ping()
        logger.info("analytics-worker: connected to Redis at %s", cfg.redis_url)
    except redis.exceptions.ConnectionError as exc:
        logger.critical("analytics-worker: cannot connect to Redis: %s", exc)
        raise SystemExit(1)

    # ClickHouse — verify connectivity once at startup before spawning workers.
    # Each worker gets its own client instance (clickhouse_connect is not thread-safe).
    ch_probe = clickhouse_connect.get_client(
        host=cfg.clickhouse_host,
        port=cfg.clickhouse_port,
        database=cfg.clickhouse_db,
        username=cfg.clickhouse_user,
        password=cfg.clickhouse_password,
    )
    if not ch_probe.ping():
        logger.critical("analytics-worker: cannot connect to ClickHouse")
        raise SystemExit(1)
    ch_probe.close()
    logger.info("analytics-worker: connected to ClickHouse at %s:%d", cfg.clickhouse_host, cfg.clickhouse_port)

    # Unique consumer name per process to avoid conflicts when scaling horizontally.
    # Uses hostname + PID so two containers don't collide in the same group.
    consumer_name = f"{socket.gethostname()}-{os.getpid()}"

    # ── 3-5. Create and start workers ────────────────────────────────────────
    # clickhouse_connect does not support concurrent queries on one client
    # instance — each worker thread must own its own client, repository, and
    # use case to avoid "concurrent queries within the same session" errors.
    threads: list[threading.Thread] = []

    for worker_name in cfg.workers:
        worker_class = WORKER_REGISTRY.get(worker_name)
        if not worker_class:
            logger.warning("analytics-worker: unknown worker type %r — skipping", worker_name)
            continue

        # Dedicated ClickHouse client per worker thread.
        worker_ch_client = clickhouse_connect.get_client(
            host=cfg.clickhouse_host,
            port=cfg.clickhouse_port,
            database=cfg.clickhouse_db,
            username=cfg.clickhouse_user,
            password=cfg.clickhouse_password,
        )
        repository = ClickHouseEventRepository(worker_ch_client)
        use_case = ProcessBatchUseCase(repository)

        # Each worker gets its own Redis consumer bound to its stream topic
        consumer = RedisStreamConsumer(
            client=redis_client,
            stream=worker_class.stream_topic,
            group_name=worker_class.group_name,
            consumer_name=consumer_name,
        )

        worker = worker_class(
            consumer=consumer,
            use_case=use_case,
            batch_size=cfg.batch_size,
            block_ms=cfg.block_ms,
        )

        # Run each worker in its own daemon thread so they all run concurrently.
        # daemon=True means threads exit automatically when the main thread exits.
        thread = threading.Thread(
            target=worker.run,
            name=f"worker-{worker_name}",
            daemon=True,
        )
        threads.append(thread)
        thread.start()
        logger.info("analytics-worker: started %s", worker_name)

    if not threads:
        logger.critical("analytics-worker: no workers started — check WORKERS env var")
        raise SystemExit(1)

    # ── 6. Start retention scheduler ─────────────────────────────────────────
    # Dedicated ClickHouse client for the retention scheduler — clickhouse_connect
    # is not thread-safe, so the scheduler must not share a client with any worker.
    retention_ch_client = clickhouse_connect.get_client(
        host=cfg.clickhouse_host,
        port=cfg.clickhouse_port,
        database=cfg.clickhouse_db,
        username=cfg.clickhouse_user,
        password=cfg.clickhouse_password,
    )
    retention_repo = ClickHouseRetentionRepository(retention_ch_client)
    purge_use_case = PurgeExpiredEventsUseCase(
        retention_repo=retention_repo,
        iam_base_url=cfg.iam_base_url,
        iam_internal_secret=cfg.iam_internal_secret,
    )
    scheduler = RetentionScheduler(
        use_case=purge_use_case,
        interval_seconds=cfg.retention_interval_seconds,
    )
    retention_thread = threading.Thread(
        target=scheduler.run,
        name="retention-scheduler",
        daemon=True,
    )
    threads.append(retention_thread)
    retention_thread.start()
    logger.info("analytics-worker: retention scheduler started (interval=%ds)", cfg.retention_interval_seconds)

    logger.info("analytics-worker: all workers running")

    # Block the main thread — workers run forever in daemon threads.
    # KeyboardInterrupt (Ctrl+C) or SIGTERM will exit cleanly.
    try:
        for thread in threads:
            thread.join()
    except KeyboardInterrupt:
        logger.info("analytics-worker: shutting down")


if __name__ == "__main__":
    main()
