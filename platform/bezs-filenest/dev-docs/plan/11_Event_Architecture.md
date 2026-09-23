# FileNest v1.0 — Event Architecture

**Version:** 1.0.0
**Status:** Approved for Engineering
**Technology:** NATS JetStream 2.x
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Event Architecture Overview](#1-event-architecture-overview)
2. [NATS JetStream Configuration](#2-nats-jetstream-configuration)
3. [Event Schemas](#3-event-schemas)
4. [Publisher Architecture](#4-publisher-architecture)
5. [Consumer Architecture](#5-consumer-architecture)
6. [Idempotency](#6-idempotency)
7. [Error Handling and Dead Letter Queue](#7-error-handling-and-dead-letter-queue)
8. [Event Delivery Guarantees](#8-event-delivery-guarantees)
9. [Event Versioning](#9-event-versioning)

---

## 1. Event Architecture Overview

### 1.1 Why NATS JetStream

| Property | NATS JetStream |
|----------|---------------|
| Delivery guarantee | At-least-once |
| Persistence | Yes (file-based) |
| Consumer groups | Yes (competing consumers) |
| Message replay | Yes (from any position) |
| Fan-out | Yes (multiple consumer groups per subject) |
| Ordering | Per-subject ordering guaranteed |
| Latency | Sub-millisecond |
| Operations burden | Low (compared to Kafka) |

### 1.2 Event Flow

```
Business Operation (DB write + event row)
  ↓ (same transaction)
events table (transactional outbox)
  ↓ (outbox worker polls every 1 second)
NATS JetStream Subject
  ↓ (fan-out to consumer groups)
  ├── processing-consumer → Processing Service
  ├── search-consumer → Search Service
  ├── webhook-consumer → Webhook Service
  └── audit-consumer → Audit Service
```

### 1.3 Subject Naming Convention

```
filenest.{organization_id}.{project_id}.{event_type}

Examples:
filenest.org_abc.proj_xyz.file.uploaded
filenest.org_abc.proj_xyz.file.processed
filenest.org_abc.proj_xyz.file.virus_detected
filenest.org_abc.*.file.uploaded          # All projects in org
filenest.*.*.file.uploaded                # All organizations (admin use only)
```

---

## 2. NATS JetStream Configuration

### 2.1 Stream Configuration

```go
// NATS JetStream stream configuration (applied via NATS CLI or admin API)
stream := jetstream.StreamConfig{
    Name:         "FILENEST_EVENTS",
    Subjects:     []string{"filenest.>"},         // Matches all subjects
    Retention:    jetstream.WorkQueuePolicy,       // Delete on ack
    MaxAge:       7 * 24 * time.Hour,              // Retain unacked messages 7 days
    MaxBytes:     50 * 1024 * 1024 * 1024,        // 50GB max
    MaxMsgs:      100_000_000,                     // 100M messages max
    Storage:      jetstream.FileStorage,           // Persisted to disk
    Replicas:     3,                               // 3-node cluster
    Compression:  jetstream.S2Compression,
    MaxMsgSize:   10 * 1024 * 1024,               // 10MB max per message
    DuplicateWindow: 5 * time.Minute,             // Deduplication window
}
```

### 2.2 Consumer Configuration

```python
# Python NATS client consumer configuration
from nats.js.api import ConsumerConfig, AckPolicy, DeliverPolicy, ReplayPolicy

CONSUMER_CONFIGS = {
    "processing-consumer": ConsumerConfig(
        durable_name="processing-workers",
        filter_subject="filenest.*.*.file.uploaded",
        ack_policy=AckPolicy.EXPLICIT,
        deliver_policy=DeliverPolicy.NEW,
        max_deliver=3,                          # Max 3 delivery attempts
        ack_wait=300,                           # 5 min ack timeout
        max_ack_pending=50,                     # Max 50 in-flight per consumer
        replay_policy=ReplayPolicy.INSTANT,
    ),

    "search-consumer": ConsumerConfig(
        durable_name="search-indexers",
        filter_subject="filenest.*.*.file.>",   # All file events
        ack_policy=AckPolicy.EXPLICIT,
        deliver_policy=DeliverPolicy.NEW,
        max_deliver=5,
        ack_wait=60,
        max_ack_pending=100,
    ),

    "webhook-consumer": ConsumerConfig(
        durable_name="webhook-delivery",
        filter_subject="filenest.>",            # All events
        ack_policy=AckPolicy.EXPLICIT,
        deliver_policy=DeliverPolicy.NEW,
        max_deliver=1,                          # Webhook service handles its own retry
        ack_wait=30,
        max_ack_pending=200,
    ),

    "audit-consumer": ConsumerConfig(
        durable_name="audit-writers",
        filter_subject="filenest.>",
        ack_policy=AckPolicy.EXPLICIT,
        deliver_policy=DeliverPolicy.NEW,
        max_deliver=10,                         # Audit is critical — more retries
        ack_wait=30,
        max_ack_pending=500,
    ),
}
```

---

## 3. Event Schemas

### 3.1 Base Event Schema

All events share a common envelope:

```python
from pydantic import BaseModel, Field
from datetime import datetime
import uuid

class BaseEvent(BaseModel):
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:16]}")
    event_type: str
    event_version: str = "1.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    organization_id: str
    project_id: str
    environment_id: str
    idempotency_key: str | None = None    # Client-provided dedup key
```

### 3.2 file.uploaded

```python
class FileUploadedPayload(BaseModel):
    file_id: str
    filename: str
    original_filename: str
    mime_type: str
    size: int
    storage_key: str
    storage_provider: str
    storage_bucket: str
    checksum_sha256: str | None
    metadata: dict
    tags: list[str]
    folder_id: str | None
    uploaded_by: str          # actor ID
    uploaded_by_type: str     # 'api_key' | 'service_account' | 'user'
    upload_ip: str | None
    pipeline_stages: list[str]  # Stages that will run

class FileUploadedEvent(BaseEvent):
    event_type: str = "file.uploaded"
    payload: FileUploadedPayload
```

### 3.3 file.processed

```python
class ProcessingStageResult(BaseModel):
    stage: str
    status: str                 # 'completed' | 'failed' | 'skipped'
    duration_ms: int | None
    result: dict | None

class FileProcessedPayload(BaseModel):
    file_id: str
    job_id: str
    status: str                 # 'completed' | 'partially_failed' | 'failed'
    stages: list[ProcessingStageResult]
    ocr_extracted: bool
    phi_detected: bool | None
    pii_detected: bool | None
    virus_scan_result: str | None
    classification: str | None
    processing_duration_ms: int

class FileProcessedEvent(BaseEvent):
    event_type: str = "file.processed"
    payload: FileProcessedPayload
```

### 3.4 file.virus_detected

```python
class VirusDetectedPayload(BaseModel):
    file_id: str
    filename: str
    storage_key: str
    threat_name: str
    scan_provider: str
    file_quarantined: bool
    uploaded_by: str
    upload_ip: str | None

class FileVirusDetectedEvent(BaseEvent):
    event_type: str = "file.virus_detected"
    payload: VirusDetectedPayload
```

### 3.5 file.deleted

```python
class FileDeletedPayload(BaseModel):
    file_id: str
    filename: str
    storage_key: str
    deleted_by: str
    deleted_by_type: str
    was_phi: bool | None
    was_under_legal_hold: bool    # Will always be False (legal hold prevents delete)
    soft_delete: bool

class FileDeletedEvent(BaseEvent):
    event_type: str = "file.deleted"
    payload: FileDeletedPayload
```

### 3.6 file.downloaded

```python
class FileDownloadedPayload(BaseModel):
    file_id: str
    filename: str
    size: int
    downloaded_by: str
    downloaded_by_type: str
    download_ip: str | None
    ttl_seconds: int
    legal_hold_active: bool
    phi_involved: bool

class FileDownloadedEvent(BaseEvent):
    event_type: str = "file.downloaded"
    payload: FileDownloadedPayload
```

### 3.7 file.versioned

```python
class FileVersionedPayload(BaseModel):
    file_id: str
    new_version_number: int
    previous_version_number: int
    new_storage_key: str
    change_note: str | None
    created_by: str

class FileVersionedEvent(BaseEvent):
    event_type: str = "file.versioned"
    payload: FileVersionedPayload
```

### 3.8 file.indexed

```python
class FileIndexedPayload(BaseModel):
    file_id: str
    index_name: str
    ocr_word_count: int | None
    metadata_fields_indexed: list[str]

class FileIndexedEvent(BaseEvent):
    event_type: str = "file.indexed"
    payload: FileIndexedPayload
```

### 3.9 Additional Events

```python
# file.legal_hold_set
# file.legal_hold_released
# file.worm_committed
# file.retention_expired
# file.restored
# api_key.created
# api_key.rotated
# api_key.revoked
# project.created
# project.config_changed
# user.login
# user.created
# webhook.failing
# webhook.recovered
```

---

## 4. Publisher Architecture

### 4.1 Transactional Outbox

```python
# backend/app/core/messaging.py
class TransactionalOutbox:
    """
    Writes events to the DB in the same transaction as the business operation.
    A background worker publishes to NATS asynchronously.

    Guarantees: events are never lost even if NATS is temporarily unavailable.
    Trade-off: small delay (< 1 second) between operation and event publication.
    """

    async def publish(
        self,
        event: BaseEvent,
        db: AsyncSession,
    ) -> None:
        """Call within the same DB transaction as the business operation."""
        outbox_record = Event(
            organization_id=event.organization_id,
            project_id=event.project_id,
            event_type=event.event_type,
            subject_id=event.payload.file_id if hasattr(event.payload, "file_id") else None,
            payload=event.model_dump(),
            status="pending",
        )
        db.add(outbox_record)
        # db.commit() happens in the parent context manager

    async def publish_immediate(
        self,
        event: BaseEvent,
        nats: JetStreamContext,
    ) -> None:
        """
        Publish directly to NATS (no outbox).
        Use only when the operation is not in a DB transaction.
        Risk: event lost if NATS is down at publish time.
        """
        subject = (
            f"filenest.{event.organization_id}."
            f"{event.project_id}."
            f"{event.event_type}"
        )
        await nats.publish(
            subject=subject,
            payload=event.model_dump_json().encode(),
            headers={
                "Nats-Msg-Id": event.event_id,  # Deduplication header
            }
        )
```

### 4.2 Outbox Worker

```python
class OutboxWorker:
    """Polls events table and publishes to NATS. Runs as a separate process."""

    async def run(self) -> None:
        logger.info("Outbox worker started")
        while True:
            published = await self._process_batch()
            if published == 0:
                await asyncio.sleep(1)  # No events — wait before next poll

    async def _process_batch(self) -> int:
        async with get_db_session() as db:
            # Select pending events with row-level locking (skip locked = no double processing)
            result = await db.execute(
                select(Event)
                .where(Event.status == "pending")
                .order_by(Event.created_at.asc())
                .limit(100)
                .with_for_update(skip_locked=True)
            )
            events = result.scalars().all()

            if not events:
                return 0

            published_count = 0
            for event in events:
                try:
                    subject = (
                        f"filenest.{event.organization_id}."
                        f"{event.project_id}."
                        f"{event.event_type}"
                    )
                    ack = await self.js.publish(
                        subject=subject,
                        payload=json.dumps(event.payload).encode(),
                        headers={"Nats-Msg-Id": str(event.id)},
                        timeout=5.0,
                    )
                    event.status = "published"
                    event.published_at = datetime.utcnow()
                    published_count += 1

                except nats.errors.TimeoutError:
                    event.attempt_count += 1
                    if event.attempt_count >= 10:
                        event.status = "failed"
                        logger.error(
                            "event_publish_failed_permanently",
                            event_id=str(event.id),
                            attempts=event.attempt_count,
                        )

            await db.commit()
            return published_count
```

---

## 5. Consumer Architecture

### 5.1 Consumer Base Class

```python
class BaseConsumer:
    def __init__(self, js: JetStreamContext, consumer_name: str):
        self.js = js
        self.consumer_name = consumer_name

    async def start(self) -> None:
        config = CONSUMER_CONFIGS[self.consumer_name]
        sub = await self.js.pull_subscribe(
            subject=config.filter_subject,
            durable=config.durable_name,
        )

        logger.info(f"Consumer {self.consumer_name} started")

        while True:
            try:
                messages = await sub.fetch(batch=10, timeout=1.0)
                for msg in messages:
                    await self._process_message(msg)
            except nats.errors.TimeoutError:
                pass  # No messages, continue polling
            except Exception as e:
                logger.error(f"Consumer error: {e}")
                await asyncio.sleep(1)

    async def _process_message(self, msg: nats.Msg) -> None:
        try:
            event = self.parse_event(msg.data)
            await self.handle(event)
            await msg.ack()

        except PermanentFailure as e:
            logger.error("Permanent failure", event_id=e.event_id)
            await msg.term()  # Move to dead letter queue

        except Exception as e:
            # Transient failure — let NATS redeliver
            logger.warning("Transient failure, will retry", error=str(e))
            delay = self._backoff_delay(msg.metadata.num_delivered)
            await msg.nak(delay=delay)

    def _backoff_delay(self, attempt: int) -> int:
        """Exponential backoff: 5s, 30s, 120s"""
        delays = [5, 30, 120]
        return delays[min(attempt - 1, len(delays) - 1)]
```

### 5.2 Processing Consumer

```python
class ProcessingConsumer(BaseConsumer):
    def __init__(self, js, pipeline_executor: PipelineExecutor):
        super().__init__(js, "processing-consumer")
        self.pipeline_executor = pipeline_executor

    async def handle(self, event: FileUploadedEvent) -> None:
        logger.info(
            "processing_file",
            file_id=event.payload.file_id,
            project_id=event.project_id,
        )
        await self.pipeline_executor.execute(event)
```

### 5.3 Search Consumer

```python
class SearchConsumer(BaseConsumer):
    def __init__(self, js, indexing_service: SearchIndexingService):
        super().__init__(js, "search-consumer")
        self.indexing_service = indexing_service

    async def handle(self, event: BaseEvent) -> None:
        if event.event_type == "file.processed":
            await self.indexing_service.index_file(
                file_id=event.payload.file_id,
                project_id=event.project_id,
            )
        elif event.event_type == "file.deleted":
            await self.indexing_service.delete_file(
                file_id=event.payload.file_id,
                project_id=event.project_id,
            )
        elif event.event_type == "file.uploaded":
            # Index immediately with available data, before OCR
            await self.indexing_service.index_file_initial(
                file_id=event.payload.file_id,
                project_id=event.project_id,
            )
```

---

## 6. Idempotency

### 6.1 Publisher Idempotency

NATS JetStream supports message deduplication via `Nats-Msg-Id` header:

```python
# Outbox worker sets message ID = event ID
# NATS JetStream deduplicates within the DuplicateWindow (5 minutes)
# Safe to re-publish same event_id without creating duplicate consumers
await js.publish(
    subject=subject,
    payload=payload,
    headers={"Nats-Msg-Id": str(event.id)},
)
```

### 6.2 Consumer Idempotency

Processing Service uses idempotent job creation:

```python
async def ensure_processing_job(
    file_id: str, project_id: str, db: AsyncSession
) -> ProcessingJob:
    """
    If job already exists for this file, return it.
    This makes the handler idempotent — redelivered messages don't create duplicate jobs.
    """
    existing = await db.execute(
        select(ProcessingJob)
        .where(
            ProcessingJob.file_id == file_id,
            ProcessingJob.status.notin_(["failed", "cancelled"]),
        )
        .order_by(ProcessingJob.created_at.desc())
        .limit(1)
    )
    job = existing.scalar_one_or_none()

    if job and job.status == "completed":
        logger.info("Processing already completed, skipping", file_id=file_id)
        return job

    if not job:
        job = ProcessingJob(
            file_id=file_id,
            project_id=project_id,
            status="pending",
        )
        db.add(job)
        await db.flush()

    return job
```

Search Service idempotency:

```python
async def index_file(self, file_id: str, project_id: str) -> None:
    # OpenSearch PUT is idempotent — safe to re-index same document
    # Version number tracks last indexed state
    await opensearch.index(
        index=f"filenest-{project_id}",
        id=file_id,             # Same ID = upsert (idempotent)
        body=doc.model_dump(),
    )
```

---

## 7. Error Handling and Dead Letter Queue

### 7.1 DLQ Strategy

Messages that fail all delivery attempts are moved to a dead letter queue:

```python
# NATS advisory on failed message (term'd by consumer)
# Subject: $JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.{stream}.{consumer}

DLQ_STREAM = "FILENEST_DLQ"
DLQ_CONFIG = jetstream.StreamConfig(
    name=DLQ_STREAM,
    subjects=["filenest.dlq.>"],
    retention=jetstream.LimitsPolicy,
    max_age=30 * 24 * time.Hour,  # Keep DLQ messages 30 days
    storage=jetstream.FileStorage,
    replicas=3,
)
```

### 7.2 DLQ Consumer and Alerting

```python
class DLQConsumer(BaseConsumer):
    async def handle(self, event: BaseEvent) -> None:
        logger.error(
            "event_dead_lettered",
            event_type=event.event_type,
            event_id=event.event_id,
            file_id=getattr(event.payload, "file_id", None),
            organization_id=event.organization_id,
        )

        # Alert on-call if critical event types
        CRITICAL_EVENTS = {"file.uploaded", "file.virus_detected", "file.deleted"}
        if event.event_type in CRITICAL_EVENTS:
            await self.alerter.send(
                severity="HIGH",
                title=f"Critical event dead-lettered: {event.event_type}",
                details={
                    "event_id": event.event_id,
                    "file_id": getattr(event.payload, "file_id", None),
                    "organization_id": event.organization_id,
                },
            )

        # Store in DLQ for manual review/replay
        await self.dlq_store.store(event)
```

### 7.3 DLQ Replay

Operations teams can replay DLQ messages:

```
POST /v1/admin/dlq/replay
{
  "event_ids": ["evt_abc123", "evt_def456"],
  "or": {
    "event_type": "file.uploaded",
    "organization_id": "org_abc",
    "from": "2026-06-15T00:00:00Z",
    "to": "2026-06-15T23:59:59Z"
  }
}
```

---

## 8. Event Delivery Guarantees

### 8.1 Guarantee Levels

| Operation | Guarantee | Mechanism |
|-----------|-----------|-----------|
| Event publication | At-least-once | Transactional outbox |
| Processing trigger | At-least-once | NATS consumer ack |
| Search indexing | At-least-once | NATS consumer ack |
| Webhook delivery | At-least-once | Webhook service retry |
| Audit logging | At-least-once + immutable | RLS-protected table |

### 8.2 Exactly-Once Semantics

True exactly-once is not attempted (too expensive). Instead:
- **Publishers**: transactional outbox + NATS dedup header = safe re-publish
- **Consumers**: idempotent handlers = safe re-process
- Combined: effectively exactly-once in practice

---

## 9. Event Versioning

### 9.1 Backward-Compatible Evolution

```python
# v1 of file.uploaded
class FileUploadedPayloadV1(BaseModel):
    file_id: str
    filename: str
    size: int

# v2 adds optional fields (backward compatible)
class FileUploadedPayloadV2(BaseModel):
    file_id: str
    filename: str
    size: int
    mime_type: str | None = None      # New field, optional
    checksum_sha256: str | None = None # New field, optional
```

### 9.2 Breaking Changes

For breaking changes:
1. Publish both old and new event version simultaneously (dual-publish)
2. Consumers updated to handle new version
3. Old version deprecated, stop publishing after migration window

```python
async def publish_file_uploaded(file: File, auth: AuthContext) -> None:
    v1_event = FileUploadedEventV1(...)
    v2_event = FileUploadedEventV2(...)

    # During migration: publish both versions
    await outbox.publish(v1_event, db)  # Old consumers
    await outbox.publish(v2_event, db)  # New consumers
```
