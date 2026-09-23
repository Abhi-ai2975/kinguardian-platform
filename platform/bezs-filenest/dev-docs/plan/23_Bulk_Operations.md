# FileNest v1.0 — Bulk Operations

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Overview](#1-overview)
2. [Bulk Job Architecture](#2-bulk-job-architecture)
3. [Bulk Delete](#3-bulk-delete)
4. [Bulk Move](#4-bulk-move)
5. [Bulk Tag](#5-bulk-tag)
6. [Bulk Download](#6-bulk-download)
7. [Bulk Metadata Update](#7-bulk-metadata-update)
8. [Bulk Reprocess](#8-bulk-reprocess)
9. [API Specification](#9-api-specification)
10. [SDK Methods](#10-sdk-methods)
11. [Database Schema](#11-database-schema)

---

## 1. Overview

Bulk operations allow acting on multiple files in a single API call. All bulk operations follow the same pattern:

1. **Submit** — client POSTs a list of file IDs + operation parameters → receives a `bulk_job_id`
2. **Execute async** — the operation runs in the background
3. **Poll or webhook** — client polls `GET /v1/bulk-jobs/{id}` or receives `bulk_job.completed` webhook

**Why async:** A bulk delete of 10,000 files involves compliance checks per file, storage deletions, search index updates, and audit log entries. This cannot run synchronously within an HTTP request timeout.

**Maximum batch size:** 10,000 file IDs per bulk job. Larger operations require multiple jobs.

---

## 2. Bulk Job Architecture

```python
class BulkJob(Base):
    __tablename__ = "bulk_jobs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    org_id: Mapped[uuid.UUID]
    project_id: Mapped[uuid.UUID]
    created_by: Mapped[uuid.UUID]
    operation: Mapped[str]  # delete | move | tag | download | metadata_update | reprocess
    status: Mapped[str]     # pending | running | completed | partial | failed
    params: Mapped[dict] = mapped_column(JSONB)
    file_ids: Mapped[list] = mapped_column(JSONB)  # Array of file_id strings

    total_count: Mapped[int] = mapped_column(default=0)
    success_count: Mapped[int] = mapped_column(default=0)
    failure_count: Mapped[int] = mapped_column(default=0)
    skipped_count: Mapped[int] = mapped_column(default=0)

    results: Mapped[dict] = mapped_column(JSONB, default=dict)
    # { "file_id": { "status": "success|failed|skipped", "reason": "..." } }

    started_at: Mapped[datetime | None]
    completed_at: Mapped[datetime | None]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

### 2.1 Bulk Job Worker

```python
class BulkJobWorker:
    """Processes bulk jobs from NATS queue."""

    async def run(self) -> None:
        sub = await self.js.pull_subscribe(
            "filenest.internal.bulk_jobs",
            durable="bulk-job-workers",
        )
        while True:
            messages = await sub.fetch(batch=5, timeout=2)
            for msg in messages:
                event = BulkJobEvent.model_validate_json(msg.data)
                await self._execute(event.bulk_job_id)
                await msg.ack()

    async def _execute(self, bulk_job_id: str) -> None:
        job = await self.db.get(BulkJob, bulk_job_id)
        if job.status != "pending":
            return  # Already picked up

        await self.db.execute(
            update(BulkJob)
            .where(BulkJob.id == bulk_job_id)
            .values(status="running", started_at=datetime.utcnow())
        )
        await self.db.commit()

        handler = self._get_handler(job.operation)
        results = {}

        for file_id in job.file_ids:
            try:
                result = await handler.process_one(file_id, job.params)
                results[file_id] = {"status": "success", **result}
                job.success_count += 1
            except SkippedError as e:
                results[file_id] = {"status": "skipped", "reason": str(e)}
                job.skipped_count += 1
            except Exception as e:
                results[file_id] = {"status": "failed", "reason": str(e)}
                job.failure_count += 1

        final_status = (
            "completed" if job.failure_count == 0
            else "partial" if job.success_count > 0
            else "failed"
        )

        await self.db.execute(
            update(BulkJob)
            .where(BulkJob.id == bulk_job_id)
            .values(
                status=final_status,
                results=results,
                completed_at=datetime.utcnow(),
            )
        )
        await self.db.commit()

        # Publish completion event → webhook delivery
        await self.nats.publish(
            f"filenest.{job.org_id}.{job.project_id}.bulk_job.completed",
            BulkJobCompletedEvent(bulk_job_id=bulk_job_id, status=final_status).model_dump_json().encode(),
        )
```

---

## 3. Bulk Delete

```python
class BulkDeleteHandler:

    async def process_one(self, file_id: str, params: dict) -> dict:
        file = await self.db.get(File, file_id)

        if file is None:
            raise SkippedError("file_not_found")

        # Run compliance checks
        policy = await self.compliance_engine.check_file_delete(file)

        if policy.decision == PolicyDecision.DENY:
            raise SkippedError(f"compliance_block: {policy.reason}")

        # Delete from storage
        storage = await get_storage_for_project(file.project_id)
        await storage.delete(file.storage_key)

        # Delete all versions
        for version in await get_file_versions(file.id, self.db):
            await storage.delete(version.storage_key)

        # Soft-delete in database
        await self.db.execute(
            update(File)
            .where(File.id == file.id)
            .values(
                status=FileStatus.DELETED,
                deleted_at=datetime.utcnow(),
                deleted_by=params["deleted_by"],
            )
        )

        # Remove from search index
        await self.search_indexer.delete_file(file.id, file.project_id)

        # Audit log
        await self.audit_logger.log(
            action="file.bulk_deleted",
            actor_id=params["deleted_by"],
            actor_type="user",
            resource_type="file",
            resource_id=file_id,
            org_id=str(file.org_id),
            project_id=str(file.project_id),
            result="success",
            db=self.db,
        )

        return {"deleted": True}
```

**Compliance skips:** Files with `legal_hold_active=True`, active WORM, or within retention period are skipped (not failed). The job reports them as `skipped` with reason `compliance_block`.

---

## 4. Bulk Move

```python
class BulkMoveHandler:

    async def process_one(self, file_id: str, params: dict) -> dict:
        target_folder_id = params.get("folder_id")  # None = root
        file = await self.db.get(File, file_id)

        if file is None:
            raise SkippedError("file_not_found")

        # Validate target folder exists and is in same project
        if target_folder_id:
            folder = await self.db.get(Folder, target_folder_id)
            if folder is None or str(folder.project_id) != str(file.project_id):
                raise ValueError("invalid_target_folder")

        # Check for name collision in target folder
        existing = await self.db.scalar(
            select(File.id)
            .where(
                File.project_id == file.project_id,
                File.folder_id == target_folder_id,
                File.original_filename == file.original_filename,
                File.deleted_at.is_(None),
                File.id != file.id,
            )
        )

        if existing and not params.get("overwrite", False):
            raise SkippedError("name_collision_in_target")

        old_folder_id = file.folder_id

        await self.db.execute(
            update(File)
            .where(File.id == file.id)
            .values(folder_id=target_folder_id)
        )

        # Update search index with new folder path
        await self.search_indexer.update_file_metadata(
            file.id, file.project_id, {"folder_id": target_folder_id}
        )

        return {"moved_from_folder": str(old_folder_id), "moved_to_folder": str(target_folder_id)}
```

---

## 5. Bulk Tag

```python
class BulkTagHandler:

    async def process_one(self, file_id: str, params: dict) -> dict:
        add_tags: list[str] = params.get("add", [])
        remove_tags: list[str] = params.get("remove", [])

        if not add_tags and not remove_tags:
            raise SkippedError("no_tags_specified")

        file = await self.db.get(File, file_id)
        if file is None:
            raise SkippedError("file_not_found")

        current_tags = set(file.tags or [])
        new_tags = (current_tags | set(add_tags)) - set(remove_tags)

        await self.db.execute(
            update(File)
            .where(File.id == file.id)
            .values(tags=list(new_tags))
        )

        # Update search index
        await self.search_indexer.update_file_metadata(
            file.id, file.project_id, {"tags": list(new_tags)}
        )

        return {"tags_before": list(current_tags), "tags_after": list(new_tags)}
```

---

## 6. Bulk Download

Bulk download creates a zip archive of all requested files and returns a signed URL to download it.

```python
class BulkDownloadHandler:
    MAX_TOTAL_SIZE = 5 * 1024**3  # 5 GB zip limit

    async def process_job(self, job: BulkJob) -> dict:
        files = await self._get_files(job.file_ids, job.project_id)
        total_size = sum(f.size for f in files)

        if total_size > self.MAX_TOTAL_SIZE:
            raise ValueError(f"Total size {total_size} exceeds 5 GB limit")

        storage = await get_storage_for_project(job.project_id)
        archive_key = f"bulk-downloads/{job.org_id}/{job.id}/download.zip"

        with tempfile.SpooledTemporaryFile(max_size=500 * 1024**2) as tmp:
            with zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zf:
                for file in files:
                    # Check download permission
                    if file.status != FileStatus.READY:
                        continue
                    file_bytes = b"".join([
                        chunk async for chunk in storage.download_stream(file.storage_key)
                    ])
                    zf.writestr(file.original_filename, file_bytes)

            tmp.seek(0)
            await storage.upload(archive_key, tmp.read(), "application/zip")

        # Signed URL valid for 1 hour
        download_url = await storage.generate_signed_url(archive_key, ttl_seconds=3600)

        return {"download_url": download_url, "expires_at": (datetime.utcnow() + timedelta(hours=1)).isoformat()}
```

Bulk download runs differently — it processes the entire job as one unit (produces one zip), not file-by-file. The job result contains the download URL.

---

## 7. Bulk Metadata Update

```python
class BulkMetadataUpdateHandler:

    async def process_one(self, file_id: str, params: dict) -> dict:
        metadata_patch: dict = params["metadata"]
        file = await self.db.get(File, file_id)

        # Validate against project schema
        project = await get_project(file.project_id, self.db)
        schema_id = project.config["metadata"].get("schemaId")

        if schema_id:
            merged = {**file.metadata, **metadata_patch}
            schema = await get_schema(schema_id, self.db)
            errors = validate_metadata(merged, schema)
            if errors:
                raise ValueError(f"schema_validation_failed: {errors}")

        await self.db.execute(
            update(File)
            .where(File.id == file.id)
            .values(
                metadata=File.metadata.op("||")(json.dumps(metadata_patch))
            )
        )

        await self.search_indexer.update_file_metadata(
            file.id, file.project_id, metadata_patch
        )

        return {"updated_fields": list(metadata_patch.keys())}
```

---

## 8. Bulk Reprocess

```python
class BulkReprocessHandler:
    """Re-queues files for processing pipeline. Used when ClamAV definitions update
    or when new pipeline stages are added to existing files."""

    async def process_one(self, file_id: str, params: dict) -> dict:
        file = await self.db.get(File, file_id)
        stages = params.get("stages")  # None = all stages

        # Create new processing job
        job = ProcessingJob(
            id=new_id("procjob"),
            file_id=file.id,
            project_id=file.project_id,
            org_id=file.org_id,
            status="pending",
            stages=stages,
            triggered_by="bulk_reprocess",
        )
        self.db.add(job)
        await self.db.commit()

        # Publish to NATS
        await self.nats.publish(
            f"filenest.{file.org_id}.{file.project_id}.file.reprocess",
            FileReprocessEvent(file_id=file_id, job_id=str(job.id), stages=stages).model_dump_json().encode(),
        )

        return {"processing_job_id": str(job.id)}
```

---

## 9. API Specification

```
POST /v1/bulk-jobs

Request (delete):
{
  "operation": "delete",
  "file_ids": ["file_abc", "file_def", "file_ghi"],
  "params": {}
}

Request (move):
{
  "operation": "move",
  "file_ids": ["file_abc", "file_def"],
  "params": { "folder_id": "folder_xyz" }
}

Request (tag):
{
  "operation": "tag",
  "file_ids": ["file_abc", "file_def"],
  "params": { "add": ["reviewed", "approved"], "remove": ["pending"] }
}

Request (download):
{
  "operation": "download",
  "file_ids": ["file_abc", "file_def"]
}

Request (metadata_update):
{
  "operation": "metadata_update",
  "file_ids": ["file_abc", "file_def"],
  "params": { "metadata": { "status": "approved", "reviewedBy": "usr_abc" } }
}

Request (reprocess):
{
  "operation": "reprocess",
  "file_ids": ["file_abc", "file_def"],
  "params": { "stages": ["virus_scan", "phi_detection"] }
}

Response (202 Accepted):
{
  "bulk_job_id": "bulkjob_abc123",
  "status": "pending",
  "total_count": 3,
  "created_at": "2026-06-15T10:00:00Z"
}

GET /v1/bulk-jobs/{id}

Response:
{
  "bulk_job_id": "bulkjob_abc123",
  "operation": "delete",
  "status": "partial",
  "total_count": 3,
  "success_count": 2,
  "failure_count": 0,
  "skipped_count": 1,
  "results": {
    "file_abc": { "status": "success" },
    "file_def": { "status": "success" },
    "file_ghi": { "status": "skipped", "reason": "compliance_block: legal_hold_active" }
  },
  "started_at": "2026-06-15T10:00:01Z",
  "completed_at": "2026-06-15T10:00:04Z"
}

GET /v1/bulk-jobs?status=completed&limit=20
DELETE /v1/bulk-jobs/{id}   // Cancel a pending job only
```

---

## 10. SDK Methods

```typescript
// @filenest/node
const result = await filenest.files.bulkDelete({
  fileIds: ["file_abc", "file_def"],
  waitForCompletion: true,  // Poll until done (default false)
  timeout: 30000,
})
// result: { jobId, status, successCount, skippedCount, results }

const result = await filenest.files.bulkMove({
  fileIds: ["file_abc", "file_def"],
  folderId: "folder_xyz",
})

const result = await filenest.files.bulkTag({
  fileIds: ["file_abc", "file_def"],
  add: ["approved"],
  remove: ["pending"],
})

const download = await filenest.files.bulkDownload({
  fileIds: ["file_abc", "file_def"],
  waitForCompletion: true,
})
// download.url → signed zip download URL

const job = await filenest.files.bulkReprocess({
  fileIds: ["file_abc"],
  stages: ["virus_scan"],
})
```

---

## 11. Database Schema

```sql
CREATE TABLE bulk_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id),
    project_id      UUID NOT NULL REFERENCES projects(id),
    created_by      UUID NOT NULL REFERENCES users(id),
    operation       TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    params          JSONB NOT NULL DEFAULT '{}',
    file_ids        JSONB NOT NULL,   -- Array of file ID strings
    total_count     INT NOT NULL DEFAULT 0,
    success_count   INT NOT NULL DEFAULT 0,
    failure_count   INT NOT NULL DEFAULT 0,
    skipped_count   INT NOT NULL DEFAULT 0,
    results         JSONB NOT NULL DEFAULT '{}',
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_operation CHECK (
        operation IN ('delete','move','tag','download','metadata_update','reprocess')
    ),
    CONSTRAINT valid_status CHECK (
        status IN ('pending','running','completed','partial','failed','cancelled')
    )
);

CREATE INDEX idx_bulk_jobs_org ON bulk_jobs (org_id, created_at DESC);
CREATE INDEX idx_bulk_jobs_pending ON bulk_jobs (status) WHERE status = 'pending';
```
