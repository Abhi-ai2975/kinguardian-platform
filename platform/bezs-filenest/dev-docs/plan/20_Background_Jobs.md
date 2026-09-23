# FileNest v1.0 — Background Jobs

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Job Scheduler Architecture](#1-job-scheduler-architecture)
2. [Upload Session Cleanup](#2-upload-session-cleanup)
3. [Retention Enforcement Job](#3-retention-enforcement-job)
4. [Audit Log Archival Job](#4-audit-log-archival-job)
5. [Processing Job Stuck Detection](#5-processing-job-stuck-detection)
6. [Share Link Expiry Cleanup](#6-share-link-expiry-cleanup)
7. [Storage Usage Calculation](#7-storage-usage-calculation)
8. [GDPR Erasure Queue](#8-gdpr-erasure-queue)
9. [Job Monitoring and Alerting](#9-job-monitoring-and-alerting)
10. [Kubernetes CronJob Definitions](#10-kubernetes-cronjob-definitions)

---

## 1. Job Scheduler Architecture

Background jobs in FileNest run as **Kubernetes CronJobs** rather than in-process schedulers (APScheduler, Celery Beat). This design choice means:

- Jobs run in isolated pods — a failing job cannot affect API pods
- Job history is visible via `kubectl get jobs`
- Concurrency is controlled by `concurrencyPolicy: Forbid`
- Missed runs during downtime are handled by `startingDeadlineSeconds`
- Resource requests are independent from API service sizing

All jobs share the same container image as the API services but are invoked via a CLI entry point:

```bash
# Entry point for all background jobs
python -m app.jobs <job_name> [--dry-run]
```

```python
# backend/app/jobs/__main__.py
import sys
import asyncio

JOB_REGISTRY = {
    "upload_cleanup": UploadSessionCleanupJob,
    "retention_enforcement": RetentionEnforcementJob,
    "audit_archival": AuditLogArchivalJob,
    "processing_stuck_detection": ProcessingStuckDetectionJob,
    "share_link_cleanup": ShareLinkExpiryCleanupJob,
    "storage_calculation": StorageCalculationJob,
    "usage_flush": UsageFlushJob,
    "gdpr_erasure": GDPRErasureQueueJob,
}

async def main():
    job_name = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    job_class = JOB_REGISTRY.get(job_name)
    if not job_class:
        print(f"Unknown job: {job_name}")
        sys.exit(1)

    job = job_class(dry_run=dry_run)
    await job.run()

asyncio.run(main())
```

---

## 2. Upload Session Cleanup

### 2.1 Problem

When a client starts a multipart upload but never completes or aborts it, the upload parts remain in object storage indefinitely. On AWS S3, incomplete multipart upload parts are billed at the same rate as stored objects. A 1 GB file with 50 abandoned parts means 50 GB of invisible storage cost.

### 2.2 Implementation

```python
class UploadSessionCleanupJob:
    # Sessions older than this with status != completed are considered abandoned
    ABANDONMENT_THRESHOLD = timedelta(hours=24)

    async def run(self) -> None:
        cutoff = datetime.utcnow() - self.ABANDONMENT_THRESHOLD

        abandoned_sessions = await self.db.execute(
            select(UploadSession)
            .where(
                UploadSession.status.in_(["pending", "in_progress"]),
                UploadSession.created_at < cutoff,
            )
        )

        cleaned = 0
        errors = 0

        for session in abandoned_sessions.scalars():
            try:
                await self._cleanup_session(session)
                cleaned += 1
            except Exception as e:
                logger.error(
                    "upload_cleanup_failed",
                    session_id=str(session.id),
                    error=str(e),
                )
                errors += 1

        logger.info(
            "upload_cleanup_completed",
            cleaned=cleaned,
            errors=errors,
        )

    async def _cleanup_session(self, session: UploadSession) -> None:
        storage = await get_storage_for_project(session.project_id)

        # Abort the multipart upload on the storage provider
        if session.multipart_upload_id:
            try:
                await storage.abort_multipart_upload(
                    session.storage_key,
                    session.multipart_upload_id,
                )
            except StorageKeyNotFound:
                pass  # Parts already cleaned up by provider

        # Mark session as expired in the database
        await self.db.execute(
            update(UploadSession)
            .where(UploadSession.id == session.id)
            .values(status="expired", expired_at=datetime.utcnow())
        )

        # If a file record was already created (upload_complete was partially called)
        # mark it as failed so it doesn't appear in listings
        if session.file_id:
            await self.db.execute(
                update(File)
                .where(
                    File.id == session.file_id,
                    File.status == FileStatus.UPLOADING,
                )
                .values(status=FileStatus.FAILED)
            )

        await self.db.commit()
```

### 2.3 S3 Lifecycle Rule (Fallback)

As a belt-and-suspenders measure, every FileNest-managed S3 bucket has a lifecycle rule that deletes incomplete multipart uploads after 2 days. This catches any uploads the cleanup job misses.

```python
async def configure_bucket_lifecycle(bucket_name: str, s3_client) -> None:
    await s3_client.put_bucket_lifecycle_configuration(
        Bucket=bucket_name,
        LifecycleConfiguration={
            "Rules": [
                {
                    "ID": "filenest-abort-incomplete-multipart",
                    "Status": "Enabled",
                    "AbortIncompleteMultipartUpload": {"DaysAfterInitiation": 2},
                    "Filter": {"Prefix": ""},
                }
            ]
        },
    )
```

---

## 3. Retention Enforcement Job

```python
class RetentionEnforcementJob:
    """
    Runs daily. Finds files past their retain_until date and applies
    the configured action: soft_delete, archive, or keep.
    """

    BATCH_SIZE = 1000

    async def run(self) -> None:
        now = datetime.utcnow()
        offset = 0

        while True:
            expired_files = await self.db.execute(
                select(File)
                .where(
                    File.retain_until <= now,
                    File.status == FileStatus.READY,
                    File.legal_hold_active == False,
                    File.deleted_at.is_(None),
                )
                .limit(self.BATCH_SIZE)
                .offset(offset)
            )
            batch = expired_files.scalars().all()
            if not batch:
                break

            for file in batch:
                await self._enforce_retention(file)

            offset += self.BATCH_SIZE
            await asyncio.sleep(0.1)  # Yield between batches

    async def _enforce_retention(self, file: File) -> None:
        project = await get_project(file.project_id, self.db)
        action = project.config["retention"].get("action", "soft_delete")

        if action == "delete":
            # Hard delete — remove from storage and database
            storage = await get_storage_for_project(file.project_id)
            await storage.delete(file.storage_key)
            await self.db.execute(
                update(File)
                .where(File.id == file.id)
                .values(
                    status=FileStatus.DELETED,
                    deleted_at=datetime.utcnow(),
                    deleted_reason="retention_expired",
                )
            )

        elif action == "archive":
            # Move to cheaper storage tier (S3 Glacier)
            await self._move_to_glacier(file)
            await self.db.execute(
                update(File)
                .where(File.id == file.id)
                .values(status=FileStatus.ARCHIVED)
            )

        elif action == "keep":
            # Just mark as retention-expired but keep accessible
            await self.db.execute(
                update(File)
                .where(File.id == file.id)
                .values(retention_expired=True)
            )

        await self.db.commit()

        await audit_logger.log(
            action=f"file.retention_{action}",
            actor_id="system",
            actor_type="system",
            resource_type="file",
            resource_id=str(file.id),
            org_id=str(file.org_id),
            project_id=str(file.project_id),
            result="success",
            metadata={"retain_until": file.retain_until.isoformat()},
            db=self.db,
        )

    async def _move_to_glacier(self, file: File) -> None:
        # Use S3 RestoreObject or copy to Glacier storage class
        pass  # Provider-specific implementation
```

---

## 4. Audit Log Archival Job

```python
class AuditLogArchivalJob:
    """
    Runs monthly. Archives audit logs older than 90 days to S3 Glacier
    to keep the hot PostgreSQL table lean while preserving 7-year retention.
    """

    ARCHIVE_THRESHOLD = timedelta(days=90)
    BATCH_SIZE = 10_000

    async def run(self) -> None:
        cutoff = datetime.utcnow() - self.ARCHIVE_THRESHOLD

        # Get all orgs with healthcare/finance profiles (strict retention)
        orgs = await self._get_regulated_orgs()

        for org in orgs:
            await self._archive_org_logs(org.id, cutoff)

    async def _archive_org_logs(self, org_id: str, cutoff: datetime) -> None:
        offset = 0
        archive_month = (datetime.utcnow() - self.ARCHIVE_THRESHOLD).strftime("%Y-%m")
        export_key = f"audit-archives/{org_id}/{archive_month}/audit_logs.jsonl.gz"

        with tempfile.SpooledTemporaryFile(max_size=50 * 1024**2) as tmp:
            with gzip.open(tmp, "wt") as gz:
                while True:
                    batch = await self.db.execute(
                        select(AuditLog)
                        .where(
                            AuditLog.org_id == org_id,
                            AuditLog.occurred_at < cutoff,
                            AuditLog.archived_at.is_(None),
                        )
                        .order_by(AuditLog.occurred_at)
                        .limit(self.BATCH_SIZE)
                        .offset(offset)
                    )
                    rows = batch.scalars().all()
                    if not rows:
                        break

                    for log in rows:
                        gz.write(json.dumps(log.to_dict()) + "\n")

                    offset += self.BATCH_SIZE

            tmp.seek(0)
            await self.storage.upload(
                export_key,
                tmp.read(),
                content_type="application/gzip",
                storage_class="GLACIER",  # Lowest cost, 3-5h retrieval
            )

        # Mark logs as archived (do not delete from DB yet — keep 90 days hot)
        await self.db.execute(
            update(AuditLog)
            .where(
                AuditLog.org_id == org_id,
                AuditLog.occurred_at < cutoff,
                AuditLog.archived_at.is_(None),
            )
            .values(archived_at=datetime.utcnow(), archive_key=export_key)
        )
        await self.db.commit()
```

---

## 5. Processing Job Stuck Detection

```python
class ProcessingStuckDetectionJob:
    """
    Runs every 15 minutes. Finds processing jobs that have been in
    'running' state too long and either retries or fails them.
    """

    STUCK_THRESHOLD = timedelta(minutes=30)
    MAX_ATTEMPTS = 3

    async def run(self) -> None:
        cutoff = datetime.utcnow() - self.STUCK_THRESHOLD

        stuck_jobs = await self.db.execute(
            select(ProcessingJob)
            .where(
                ProcessingJob.status == "running",
                ProcessingJob.started_at < cutoff,
            )
        )

        for job in stuck_jobs.scalars():
            if job.attempt_count < self.MAX_ATTEMPTS:
                # Re-queue
                await self.db.execute(
                    update(ProcessingJob)
                    .where(ProcessingJob.id == job.id)
                    .values(
                        status="pending",
                        attempt_count=job.attempt_count + 1,
                        started_at=None,
                    )
                )
                await self._republish_job(job)
                logger.warning(
                    "processing_job_requeued",
                    job_id=str(job.id),
                    file_id=str(job.file_id),
                    attempt=job.attempt_count + 1,
                )
            else:
                # Max retries exceeded — mark as permanently failed
                await self.db.execute(
                    update(ProcessingJob)
                    .where(ProcessingJob.id == job.id)
                    .values(
                        status="failed",
                        failed_at=datetime.utcnow(),
                        failure_reason="stuck_timeout_exceeded_max_retries",
                    )
                )
                # File is still accessible — just not processed
                await self.db.execute(
                    update(File)
                    .where(File.id == job.file_id)
                    .values(status=FileStatus.READY)
                )
                logger.error(
                    "processing_job_permanently_failed",
                    job_id=str(job.id),
                    file_id=str(job.file_id),
                )

        await self.db.commit()
```

---

## 6. Share Link Expiry Cleanup

```python
class ShareLinkExpiryCleanupJob:
    """Runs hourly. Deactivates expired share links."""

    async def run(self) -> None:
        now = datetime.utcnow()

        result = await self.db.execute(
            update(ShareLink)
            .where(
                ShareLink.active == True,
                ShareLink.expires_at <= now,
            )
            .values(active=False)
            .returning(ShareLink.id)
        )
        expired_count = len(result.fetchall())

        # Also deactivate links that hit their download limit
        result = await self.db.execute(
            update(ShareLink)
            .where(
                ShareLink.active == True,
                ShareLink.max_downloads.is_not(None),
                ShareLink.download_count >= ShareLink.max_downloads,
            )
            .values(active=False)
            .returning(ShareLink.id)
        )
        limit_reached_count = len(result.fetchall())

        await self.db.commit()
        logger.info(
            "share_link_cleanup_completed",
            expired=expired_count,
            limit_reached=limit_reached_count,
        )
```

---

## 7. Storage Usage Calculation

Documented in `17_Usage_Metering.md` §5. Runs every hour.

---

## 8. GDPR Erasure Queue

```python
class GDPRErasureQueueJob:
    """
    Runs every 15 minutes. Processes pending erasure requests.
    Erasure is async because it may involve deleting large numbers
    of files from object storage.
    """

    async def run(self) -> None:
        pending = await self.db.execute(
            select(GDPRErasureRequest)
            .where(GDPRErasureRequest.status == "pending")
            .order_by(GDPRErasureRequest.requested_at)
            .limit(10)   # Process max 10 erasure requests per run
            .with_for_update(skip_locked=True)
        )

        for request in pending.scalars():
            await self.db.execute(
                update(GDPRErasureRequest)
                .where(GDPRErasureRequest.id == request.id)
                .values(status="processing")
            )
            await self.db.commit()

            try:
                service = GDPRErasureService(self.db, self.storage)
                result = await service.process_erasure_request(request)

                await self.db.execute(
                    update(GDPRErasureRequest)
                    .where(GDPRErasureRequest.id == request.id)
                    .values(
                        status="completed" if result.files_retained == 0 else "partial",
                        files_erased=result.files_erased,
                        files_quarantined=result.files_quarantined,
                        files_retained=result.files_retained,
                        result_detail=result.model_dump(),
                        completed_at=datetime.utcnow(),
                    )
                )
                await self.db.commit()

            except Exception as e:
                logger.error("gdpr_erasure_failed", request_id=str(request.id), error=str(e))
                await self.db.execute(
                    update(GDPRErasureRequest)
                    .where(GDPRErasureRequest.id == request.id)
                    .values(status="pending")  # Retry on next run
                )
                await self.db.commit()
```

---

## 9. Job Monitoring and Alerting

Every job emits Prometheus metrics:

```python
JOB_DURATION = Histogram(
    "filenest_job_duration_seconds",
    "Background job execution duration",
    ["job_name"],
)

JOB_STATUS = Counter(
    "filenest_job_runs_total",
    "Background job run count",
    ["job_name", "status"],  # status: success | failed
)

JOB_ITEMS_PROCESSED = Counter(
    "filenest_job_items_processed_total",
    "Items processed by background jobs",
    ["job_name"],
)
```

Prometheus alert if a job has not run successfully in 2× its expected interval:

```yaml
- alert: BackgroundJobNotRunning
  expr: |
    time() - filenest_job_last_success_timestamp{job_name="upload_cleanup"} > 7200
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "upload_cleanup job has not run successfully in 2 hours"
```

---

## 10. Kubernetes CronJob Definitions

```yaml
# helm/templates/jobs/upload-cleanup.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: upload-session-cleanup
spec:
  schedule: "0 * * * *"          # Every hour
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 300
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 1800    # 30-min timeout
      template:
        spec:
          restartPolicy: Never
          serviceAccountName: filenest-jobs
          containers:
            - name: job
              image: "{{ .Values.global.image.registry }}/filenest/api-gateway:{{ .Chart.AppVersion }}"
              command: ["python", "-m", "app.jobs", "upload_cleanup"]
              resources:
                requests:
                  cpu: "100m"
                  memory: "256Mi"
                limits:
                  cpu: "500m"
                  memory: "512Mi"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: retention-enforcement
spec:
  schedule: "0 3 * * *"           # Daily at 3am UTC
  concurrencyPolicy: Forbid
  startingDeadlineSeconds: 3600
  jobTemplate:
    spec:
      backoffLimit: 1
      activeDeadlineSeconds: 7200  # 2-hour timeout
      template:
        spec:
          restartPolicy: Never
          serviceAccountName: filenest-jobs
          containers:
            - name: job
              image: "{{ .Values.global.image.registry }}/filenest/api-gateway:{{ .Chart.AppVersion }}"
              command: ["python", "-m", "app.jobs", "retention_enforcement"]
              resources:
                requests:
                  cpu: "500m"
                  memory: "512Mi"
                limits:
                  cpu: "2"
                  memory: "1Gi"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: processing-stuck-detection
spec:
  schedule: "*/15 * * * *"        # Every 15 minutes
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 0
      activeDeadlineSeconds: 300
      template:
        spec:
          restartPolicy: Never
          serviceAccountName: filenest-jobs
          containers:
            - name: job
              image: "{{ .Values.global.image.registry }}/filenest/api-gateway:{{ .Chart.AppVersion }}"
              command: ["python", "-m", "app.jobs", "processing_stuck_detection"]
              resources:
                requests:
                  cpu: "100m"
                  memory: "256Mi"
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: audit-log-archival
spec:
  schedule: "0 2 1 * *"           # Monthly on the 1st at 2am
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      activeDeadlineSeconds: 14400  # 4-hour timeout
      template:
        spec:
          restartPolicy: Never
          serviceAccountName: filenest-jobs
          containers:
            - name: job
              image: "{{ .Values.global.image.registry }}/filenest/api-gateway:{{ .Chart.AppVersion }}"
              command: ["python", "-m", "app.jobs", "audit_archival"]
              resources:
                requests:
                  cpu: "500m"
                  memory: "1Gi"
                limits:
                  cpu: "2"
                  memory: "2Gi"
```

### 10.1 Job Schedule Summary

| Job | Schedule | Max Runtime | Priority |
|-----|----------|-------------|----------|
| upload_cleanup | Every hour | 30 min | Medium |
| usage_flush | Every 5 min | 5 min | High |
| storage_calculation | Every hour | 30 min | Medium |
| processing_stuck_detection | Every 15 min | 5 min | High |
| share_link_cleanup | Every hour | 10 min | Low |
| retention_enforcement | Daily 3am | 2 hours | Medium |
| audit_archival | Monthly 1st | 4 hours | Low |
| gdpr_erasure | Every 15 min | 15 min | High |
