# FileNest Processing Pipeline — How It Works & Every Bug We Fixed

> Written for someone who's never seen this code before. No jargon without explanation.

---

## Part 1 — How the Pipeline Works (The Big Picture)

Imagine you have a post office. When someone drops a letter in the letterbox, the letter goes through several checkpoints before it's marked "delivered." FileNest's processing pipeline works the same way. When a user uploads a file, the file goes through a series of checks before it's marked `ready` for use.

Here's the journey of a file from upload to `ready`:

```
User uploads file
      │
      ▼
┌─────────────────┐
│  FastAPI router  │  ← Receives the file, saves it to object storage (RustFS/S3/MinIO)
│  (HTTP handler)  │    Sets file status = "processing" in PostgreSQL
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Outbox table   │  ← Writes a "file.uploaded" event record into the database
│  (PostgreSQL)   │    in the SAME transaction as saving the file.
└────────┬────────┘    This guarantees the event is never lost even if the server crashes.
         │
         ▼
┌─────────────────┐
│  OutboxWorker   │  ← A background loop that polls the outbox table every 1 second.
│  (background)   │    Picks up unpublished events and sends them to NATS JetStream.
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  NATS JetStream                 │  ← A message bus (like a conveyor belt).
│  Stream: FILENEST_EVENTS        │    Holds the "file.uploaded" message durably —
│  Subject: filenest.{org}.       │    even if no one is listening right now,
│           {project}.file.       │    the message won't be lost.
│           uploaded              │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐
│ ProcessingWorker│  ← Always-running background task. Subscribed to NATS.
│  (background)   │    The moment a "file.uploaded" message arrives, this fires.
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│  PipelineExecutor.run()                                 │
│                                                         │
│  Stage 1: VirusScanStage                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Downloads the file from storage.                │   │
│  │ Sends it to ClamAV (antivirus daemon).          │   │
│  │ ClamAV scans the bytes and replies:             │   │
│  │   → "OK" (clean) — continue to next stage      │   │
│  │   → "FOUND" (virus) — stop, mark quarantined   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Stage 2: MimeValidationStage                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Reads the first 4KB of the file.               │   │
│  │ Uses python-magic (libmagic) to detect the     │   │
│  │ REAL content type from the bytes.              │   │
│  │ Compares to what the client declared.          │   │
│  │   → Match — continue                           │   │
│  │   → Mismatch (e.g. .exe disguised as .jpg)    │   │
│  │     — mark failed                              │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Stage 3: ClassificationStage                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Pure extension lookup — no I/O.                │   │
│  │ .jpg → "image", .pdf → "document", etc.        │   │
│  │ Sets the file's category field.                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  All stages passed → status = "ready"                  │
│  Write status + emit "file.ready" event (outbox)       │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  WebhookWorker  │  ← Picks up the "file.ready" event from NATS.
│  (background)   │    Finds all webhooks registered for this project.
└────────┬────────┘    POSTs the event payload to each customer URL with an HMAC signature.
         │
         ▼
  Customer's server receives the webhook.
  File is ready to download.
```

### Key Design Decisions

**Why the outbox table?**
The database write (file record) and the NATS publish happen in two separate systems. If the server crashes between saving the file and publishing the NATS event, the event is lost and the file stays `processing` forever. Writing the event to the database *in the same transaction* as the file record means both either succeed together or fail together. The OutboxWorker then publishes from the database — safe, guaranteed delivery.

**Why NATS JetStream?**
NATS JetStream persists messages to disk. If the backend is down when a file is uploaded, the `file.uploaded` message sits safely in the stream. The moment the backend restarts, the ProcessingWorker picks it up and processes the file. Nothing is lost.

**Why background workers for processing?**
The upload HTTP endpoint returns to the user immediately after saving the file (`status=processing`). The virus scan can take seconds to minutes. Making the user wait for the scan to finish before the upload response is a terrible experience. Background workers decouple "the file is saved" from "the file is scanned."

---

## Part 2 — Every Bug We Hit and How We Fixed It

This section documents every error that blocked the pipeline from working, in the order they appeared.

---

### Bug 1 — Wrong Storage Bucket (Pipeline Couldn't Read the File)

**What happened:**
The pipeline downloaded the file from the wrong place. The error was:
```
pipeline.unhandled_error — NoSuchKey / bucket not found
```

**Why it happened:**
When a project is created, FileNest creates a dedicated bucket for it (e.g. `fn-edaecd7e-...`). The pipeline was falling back to the default platform bucket (`filenest`) instead of reading the project's `StorageConfig` from the database.

The upload service correctly resolved the bucket via `StorageConfig`. The pipeline didn't — it used a simpler fallback that pointed at the wrong bucket.

**Fix:**
In `pipeline.py`, before downloading the file, we now query `StorageConfigRepository` to get the project's storage configuration, then build the provider from that config:
```python
storage_cfg = await storage_config_repo.get_for_project(project_id, organization_id)
provider = storage_resolver.build_provider(storage_cfg)
content = await provider.download_bytes(file.storage_key)
```

---

### Bug 2 — ClamAV Scan Had No Timeout

**What happened:**
If ClamAV was slow or overloaded, the pipeline would hang indefinitely. A stuck pipeline means the file stays `processing` forever, and the NATS message is never acked, so NATS would re-deliver it after the ack_wait period — causing duplicate pipeline runs.

**Fix:**
Wrapped the ClamAV `instream()` call with `asyncio.wait_for()`:
```python
await asyncio.wait_for(
    asyncio.to_thread(_scan),
    timeout=float(settings.clamav_timeout)
)
```
Added `CLAMAV_TIMEOUT=300` to `.env.example`. If ClamAV doesn't respond within 5 minutes, the scan raises `TimeoutError`, the pipeline catches it, and marks the file `failed`.

---

### Bug 3 — `ConsumerConfig` Passed to `pull_subscribe` Broke the Subscription

**What happened:**
To set a longer ack timeout (so NATS wouldn't re-deliver a file mid-scan), we added:
```python
psub = await js.pull_subscribe(
    subject=_filter,
    durable=_CONSUMER_DURABLE,
    stream=settings.nats_stream_name,
    config=nats.js.api.ConsumerConfig(
        durable_name=_CONSUMER_DURABLE,
        filter_subject=_filter,
        ack_wait=360,
    ),
)
```

NATS monitoring showed:
```json
"delivered": { "consumer_seq": 0, "stream_seq": 0 },
"num_pending": 1,
"num_waiting": 0,
"api": { "total": 6, "errors": 3 }
```

`num_pending: 1` means the message is there. `delivered: {0}` means nothing was ever fetched. `api.errors: 3` out of 6 API calls means the subscription setup itself was failing silently.

**Why it happened:**
The version of `nats-py` installed doesn't support passing `config=` to `pull_subscribe`. When it was passed, the internal subscription setup failed silently — no exception was raised, but the consumer never registered properly with the NATS server.

**Fix:**
Removed the `config=` parameter entirely. The consumer was created by NATS automatically with default settings:
```python
psub = await js.pull_subscribe(
    subject=_filter,
    durable=_CONSUMER_DURABLE,
    stream=settings.nats_stream_name,
)
```

---

### Bug 4 — `python-magic` Crashed the Worker Process on Windows

**What happened:**
After `virus_scan.clean` was logged, the pipeline went silent. No `mime_validation.ok`, no `pipeline.ready`, no error log. The file stayed in `processing` forever.

Running a quick test revealed the problem:
```powershell
uv run python -c "import magic; print(magic.from_buffer(b'\xff\xd8\xff', mime=True))"
# Exit code: 9
```

Exit code 9 on Windows means the Python process was killed by a native crash — not a Python exception. It can't be caught by `try/except`.

**Why it happened:**
`python-magic` is a Python wrapper around the C library `libmagic`. On Linux, `libmagic` comes pre-installed. On Windows, it must be installed separately. The `python-magic` package assumes it's already there. When the MIME validation stage called `magic.from_buffer()`, the C library wasn't found, and the DLL loading failure crashed the **entire process** — not just the current thread.

Because the crash happened inside `asyncio.to_thread()` (which runs the function in a thread pool), the whole worker process died. Uvicorn's reloader detected the crash and spawned a new worker silently. The new worker had no way to resume mid-pipeline, leaving the file at `status=processing`.

**Fix:**
Replace `python-magic` with `python-magic-bin` in `pyproject.toml`:
```toml
# Before:
"python-magic>=0.4",
# After:
"python-magic-bin>=0.4",
```
`python-magic-bin` is a drop-in replacement that bundles `libmagic.dll` inside the package. No separate install required. After this change:
```powershell
uv run python -c "import magic; print(magic.from_buffer(b'\xff\xd8\xff\xe0', mime=True))"
# OK: image/jpeg
```

---

### Bug 5 — Startup Recovery Was Blocking HTTP Requests

**What happened:**
We added a recovery function to re-queue stuck files at startup. It was called with `await` in the lifespan:
```python
await _requeue_stuck_processing_files()  # blocks until done
yield  # server only accepts requests after yield
```

This meant the server didn't accept any HTTP requests until the recovery scan finished — which could take seconds on a large DB.

A user hitting the API during startup would get connection refused.

**Fix:**
Removed the recovery logic entirely. Instead:
- The NATS stream already persists unacked messages. If the server crashes mid-pipeline, NATS re-delivers the `file.uploaded` message when the server restarts.
- The idempotency guard (Bug 6 below) prevents double processing.

No recovery scan needed.

---

### Bug 6 — Duplicate Pipeline Runs on the Same File

**What happened:**
After restarting the backend multiple times to debug issues, the NATS stream accumulated multiple `file.uploaded` messages for the same file (each restart + recovery had added another). When the backend started, it received all of them at once and ran 4 concurrent pipelines on the same file.

**Fix:**
Added an idempotency check at the very start of `PipelineExecutor._execute()`:
```python
file = await repo.get(file_id, organization_id, project_id)

if file.status != "processing":
    logger.info("pipeline.skip_already_processed", file_id=file_id, status=file.status)
    return
```

If the first pipeline already moved the file to `ready` or `failed`, subsequent deliveries for the same file are silently dropped. Safe to re-deliver as many times as NATS wants.

---

### Bug 7 — Pull Consumer Only Delivered the First Message Per Session

**What happened:**
This was the hardest bug to diagnose. After fixing all the above, a new file uploaded would be processed correctly. But any *subsequent* file uploaded — without restarting the server — would stay in `processing` indefinitely. Restarting the server would immediately process it.

NATS monitoring always showed:
```json
"num_pending": 1,   ← message is there
"num_waiting": 0    ← no active fetch request from the client
```

The processing worker uses a pull consumer — it must explicitly ask NATS for messages in a loop:
```python
while True:
    msgs = await psub.fetch(10, timeout=5.0)
    # process msgs...
```

When `fetch()` is called and NATS has messages, it returns them and `num_waiting` briefly hits 1 then 0 again. But for all messages after the first, `num_waiting` stayed at 0 permanently — meaning the client wasn't even sending fetch requests to NATS anymore.

**Why it happened:**
This is a behaviour of `nats-py`'s pull subscription implementation. After the first batch is delivered and acked, subsequent calls to `psub.fetch()` appear to return immediately with an empty result (rather than waiting `timeout` seconds and raising `TimeoutError`). This puts the loop into a silent busy-spin — fetching thousands of times per second, all returning empty, never registering a server-side fetch request. When a new message arrives, it lands in the stream but the client's rapid-fire requests are out of sync with the delivery mechanism.

**Fix:**
Switch from a **pull consumer** to a **push consumer**. With a push consumer, NATS delivers messages *to the client* the moment they arrive. No polling loop required.

```python
# Before: pull consumer (broken)
psub = await js.pull_subscribe(subject, durable=name, stream=stream)
while True:
    msgs = await psub.fetch(10, timeout=5.0)
    for msg in msgs:
        asyncio.create_task(handle(msg))

# After: push consumer (fixed)
async def _on_message(msg):
    asyncio.create_task(handle(msg))

sub = await js.subscribe(
    subject=subject,
    durable=name,
    stream=stream,
    cb=_on_message,
    manual_ack=True,
)
# NATS calls _on_message the instant any matching message arrives.
# Worker just sleeps in a loop, waiting to be cancelled.
while True:
    await asyncio.sleep(5)
```

Both `ProcessingWorker` and `WebhookWorker` were converted to push consumers.

> **Note:** Switching from pull to push changes the consumer type in NATS. A NATS container wipe (`docker compose rm -f nats`) is required to clear the old pull consumer records before starting with push consumers.

---

### Bug 8 — Uvicorn Reloader Restarted the Worker When Packages Were Installed

**What happened:**
While debugging, we ran `uv add python-magic-bin` to install the new package. Uvicorn's `--reload` flag watches the entire backend directory for file changes — including `.venv/`. When the new DLL files landed in `.venv/`, uvicorn detected "changes" and restarted the worker process mid-debugging session.

The new worker started fresh, connected to NATS, picked up the stale pull subscription in a broken state, and appeared to be working when it wasn't.

**Fix:**
Add `--reload-exclude ".venv"` to the uvicorn dev command so the virtual environment directory is never watched:
```
uv run uvicorn app.main:app --reload --port 8000 --log-level debug --reload-exclude ".venv"
```
This is now the standard dev command in `justfile`.

---

### Bug 9 — `TP_NUM_C_BUFS too small: 50` Fatal Crash on Windows Git Bash

**What happened:**
Running the backend from Git Bash (MSYS2/Cygwin) on Windows and triggering multiple concurrent pipeline runs caused a fatal crash:
```
fatal error: TP_NUM_C_BUFS too small: 50
```
The server process was killed by the OS with no Python traceback.

**Why it happened:**
Each pipeline stage that calls blocking code (ClamAV scan, python-magic) uses `asyncio.to_thread()` to run in a thread pool. When multiple pipelines ran concurrently, many threads were spawned simultaneously. Git Bash on Windows uses the MSYS2/Cygwin runtime, which has a hard limit of 50 on a specific internal thread buffer. Exceeding that limit causes an immediate fatal process abort.

**Fix:**
Run the backend from **PowerShell** instead of Git Bash. PowerShell uses the native Windows thread model, which has no such limit. The command is identical — only the terminal changes.

---

## Part 3 — Current State (All Fixed)

After all fixes, the pipeline runs like this every time:

```
Upload file
  → outbox writes file.uploaded event (same DB transaction)
  → OutboxWorker publishes to NATS within ~1 second
  → ProcessingWorker._on_message() fires immediately (push consumer)
  → PipelineExecutor runs:
       virus_scan.clean ✓
       mime_validation.ok (image/jpeg) ✓
       pipeline.ready (category=image) ✓
  → File status = "ready" in DB
  → file.ready event emitted to NATS
  → WebhookWorker delivers to customer endpoints
```

This works for every upload, indefinitely, without restarting the server.

---

## Appendix — Files Changed

| File | Change |
|------|--------|
| `backend/app/workers/processing.py` | Switched from pull consumer to push consumer; removed `ConsumerConfig` |
| `backend/app/workers/webhook.py` | Switched from pull consumer to push consumer |
| `backend/app/processing/pipeline.py` | Added idempotency guard; fixed storage provider resolution |
| `backend/app/processing/stages/virus_scan.py` | Added `asyncio.wait_for` timeout around ClamAV scan |
| `backend/app/main.py` | Removed startup recovery blocking; kept CORS restoration as background task |
| `backend/pyproject.toml` | Replaced `python-magic` with `python-magic-bin` |
| `justfile` | Added `--reload-exclude ".venv"` to backend dev command |
