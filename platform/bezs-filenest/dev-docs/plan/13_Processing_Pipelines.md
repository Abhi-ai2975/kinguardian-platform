# FileNest v1.0 — Processing Pipelines

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Processing Architecture Overview](#1-processing-architecture-overview)
2. [Pipeline Configuration](#2-pipeline-configuration)
3. [Worker Architecture](#3-worker-architecture)
4. [Pipeline Stages](#4-pipeline-stages)
5. [Virus Scan Stage](#5-virus-scan-stage)
6. [MIME Validation Stage](#6-mime-validation-stage)
7. [OCR Stage](#7-ocr-stage)
8. [PHI Detection Stage](#8-phi-detection-stage)
9. [PII Detection Stage](#9-pii-detection-stage)
10. [Classification Stage](#10-classification-stage)
11. [Thumbnail Generation Stage](#11-thumbnail-generation-stage)
12. [Embedding Generation Stage](#12-embedding-generation-stage)
13. [Indexing Stage](#13-indexing-stage)
14. [Retry and Failure Handling](#14-retry-and-failure-handling)

---

## 1. Processing Architecture Overview

### 1.1 Design Principles

1. **Non-blocking** — uploads return immediately; processing is always async
2. **Stage isolation** — failure of one stage does not block other stages
3. **File available immediately** — files can be downloaded before processing completes
4. **Configurable** — which stages run is determined by project configuration
5. **Idempotent** — stages can be re-run without side effects
6. **Observable** — every stage result is stored and queryable

### 1.2 Pipeline Architecture

```
NATS: file.uploaded
  ↓
Processing Consumer (pull subscriber)
  ↓
PipelineExecutor
  ├── Phase 1: Parallel (independent checks)
  │   ├── VirusScanStage
  │   └── MimeValidationStage
  │
  │   [HALT if virus detected or MIME is illegal]
  │
  ├── Phase 2: Sequential (depend on file availability)
  │   ├── OCRStage (requires clean file)
  │   ├── PHIDetectionStage (requires OCR text)
  │   └── PIIDetectionStage (requires OCR text)
  │
  └── Phase 3: Parallel (use results from Phase 2)
      ├── ClassificationStage
      ├── ThumbnailStage
      ├── EmbeddingStage (v2)
      └── IndexingStage

NATS: file.processed → Search Service, Webhook Service
```

---

## 2. Pipeline Configuration

### 2.1 Project Pipeline Config

```python
class ProcessingConfig(BaseModel):
    virus_scan: bool = True
    mime_validation: bool = True
    ocr: bool = False
    ocr_provider: Literal["tesseract", "textract", "azure_ocr"] = "tesseract"
    ocr_languages: list[str] = ["en"]
    phi_detection: bool = False
    phi_action: Literal["log", "flag", "quarantine", "block"] = "log"
    pii_detection: bool = False
    pii_action: Literal["log", "flag", "quarantine"] = "log"
    classification: bool = False
    thumbnail_generation: bool = False
    thumbnail_sizes: list[int] = [128, 256, 512]
    embedding_generation: bool = False
    embedding_model: str = "text-embedding-3-small"

    # MIME-type-specific overrides
    ocr_enabled_for_mime_types: list[str] = ["application/pdf", "image/*"]
    thumbnail_enabled_for_mime_types: list[str] = ["image/*", "application/pdf"]

    def get_stages(self, mime_type: str) -> list[str]:
        """Determine which stages to run for a given file MIME type."""
        stages = []

        if self.virus_scan:
            stages.append("virus_scan")
        if self.mime_validation:
            stages.append("mime_validation")

        if self.ocr and matches_any_mime(mime_type, self.ocr_enabled_for_mime_types):
            stages.append("ocr")

        if self.phi_detection:
            stages.append("phi_detection")
        if self.pii_detection:
            stages.append("pii_detection")
        if self.classification:
            stages.append("classification")

        if self.thumbnail_generation and matches_any_mime(
            mime_type, self.thumbnail_enabled_for_mime_types
        ):
            stages.append("thumbnail")

        if self.embedding_generation:
            stages.append("embedding")

        stages.append("indexing")  # Always last
        return stages
```

---

## 3. Worker Architecture

### 3.1 Worker Process

```python
# backend/app/services/processing.py
import asyncio
import nats
from nats.js import JetStreamContext

class ProcessingWorkerProcess:
    """
    Runs as an independent process.
    Scaled via Kubernetes HPA based on NATS consumer lag.
    """

    def __init__(self, concurrency: int = 10):
        self.concurrency = concurrency
        self.semaphore = asyncio.Semaphore(concurrency)

    async def run(self) -> None:
        nc = await nats.connect(settings.nats_url)
        js = nc.jetstream()

        sub = await js.pull_subscribe(
            subject="filenest.*.*.file.uploaded",
            durable="processing-workers",
            config=ConsumerConfig(
                max_ack_pending=self.concurrency * 2,
                ack_wait=300,
                max_deliver=3,
            ),
        )

        logger.info("Processing worker started", concurrency=self.concurrency)

        while True:
            try:
                messages = await sub.fetch(batch=self.concurrency, timeout=2.0)
                tasks = [self._process(msg) for msg in messages]
                await asyncio.gather(*tasks)
            except nats.errors.TimeoutError:
                pass
            except Exception as e:
                logger.error("Worker error", error=str(e))
                await asyncio.sleep(1)

    async def _process(self, msg: nats.Msg) -> None:
        async with self.semaphore:
            try:
                event = FileUploadedEvent.model_validate_json(msg.data)
                executor = PipelineExecutor()
                await executor.execute(event)
                await msg.ack()
            except PermanentFailure:
                await msg.term()
            except Exception as e:
                logger.warning("Processing failed, will retry", error=str(e))
                await msg.nak(delay=self._backoff(msg.metadata.num_delivered))

    def _backoff(self, attempt: int) -> int:
        return min(5 * (2 ** (attempt - 1)), 300)  # Max 5 min
```

### 3.2 Worker Scaling with KEDA

```yaml
# helm/templates/processing/keda-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: processing-workers-scaler
spec:
  scaleTargetRef:
    name: processing-workers
  minReplicaCount: 3
  maxReplicaCount: 100
  cooldownPeriod: 180
  triggers:
    - type: nats-jetstream
      metadata:
        account: "$G"
        stream: FILENEST_EVENTS
        consumer: processing-workers
        lagThreshold: "50"         # Scale up when 50+ jobs per pod
        activationLagThreshold: "10"
```

---

## 4. Pipeline Stages

### 4.1 Stage Base Class

```python
from abc import ABC, abstractmethod

class PipelineStage(ABC):
    name: str

    def __init__(
        self,
        storage: StorageProvider,
        db: AsyncSession,
        settings: Settings,
    ):
        self.storage = storage
        self.db = db
        self.settings = settings

    @abstractmethod
    async def execute(self, event: FileUploadedEvent) -> dict:
        """Execute stage. Returns result dict stored in processing_job_stages."""
        ...

    async def download_file(self, storage_key: str) -> bytes:
        """Helper: download file bytes from storage."""
        chunks = []
        async for chunk in self.storage.download_stream(storage_key):
            chunks.append(chunk)
        return b"".join(chunks)

    def should_skip(self, mime_type: str) -> bool:
        """Override to add MIME-type-based skip logic."""
        return False
```

---

## 5. Virus Scan Stage

```python
import clamd
import io

class VirusScanStage(PipelineStage):
    name = "virus_scan"

    async def execute(self, event: FileUploadedEvent) -> dict:
        start = time.monotonic()

        file_bytes = await self.download_file(event.payload.storage_key)

        result = await self._scan(file_bytes)

        if result["status"] == "FOUND":
            # Quarantine the file
            await self.db.execute(
                update(File)
                .where(File.id == event.payload.file_id)
                .values(
                    status=FileStatus.QUARANTINED,
                    virus_scan_result="infected",
                )
            )
            raise VirusDetectedError(
                threat=result["threat"],
                file_id=event.payload.file_id,
            )

        # Update file record
        await self.db.execute(
            update(File)
            .where(File.id == event.payload.file_id)
            .values(virus_scan_result="clean")
        )

        return {
            "provider": "clamav",
            "version": await self._get_clamav_version(),
            "result": "clean",
            "file_size": len(file_bytes),
            "duration_ms": int((time.monotonic() - start) * 1000),
        }

    async def _scan(self, file_bytes: bytes) -> dict:
        loop = asyncio.get_event_loop()

        def _do_scan():
            scanner = clamd.ClamdNetworkSocket(
                host=self.settings.clamav_host,
                port=self.settings.clamav_port,
                timeout=60,
            )
            return scanner.instream(io.BytesIO(file_bytes))

        result = await loop.run_in_executor(None, _do_scan)
        scan = result.get("stream", ("UNKNOWN", None))
        return {
            "status": scan[0],      # 'OK' | 'FOUND' | 'ERROR'
            "threat": scan[1],      # Threat name if FOUND
        }

    async def _get_clamav_version(self) -> str:
        try:
            scanner = clamd.ClamdNetworkSocket(host=self.settings.clamav_host)
            version_info = scanner.version()
            return version_info.split("/")[0].strip()
        except Exception:
            return "unknown"
```

### 5.1 ClamAV Deployment

```yaml
# helm/templates/clamav/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clamav
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: clamav
          image: clamav/clamav:stable
          ports:
            - containerPort: 3310
          env:
            - name: CLAMD_CONF_OPS
              value: "StreamMaxLength 100M"
          resources:
            requests:
              memory: "2Gi"
              cpu: "500m"
            limits:
              memory: "4Gi"
              cpu: "2"
          livenessProbe:
            exec:
              command: ["clamdcheck.sh"]
            initialDelaySeconds: 60
            periodSeconds: 30
```

---

## 6. MIME Validation Stage

```python
import magic

class MimeValidationStage(PipelineStage):
    name = "mime_validation"

    # MIME types that are never allowed regardless of project config
    ALWAYS_BLOCKED_MIME_TYPES = {
        "application/x-msdownload",         # .exe
        "application/x-executable",
        "application/x-shockwave-flash",    # .swf
        "application/x-javascript",
        "text/javascript",
    }

    async def execute(self, event: FileUploadedEvent) -> dict:
        file_bytes = await self.download_file(event.payload.storage_key)

        # Detect actual MIME type from magic bytes
        detected_mime = magic.from_buffer(file_bytes[:8192], mime=True)
        declared_mime = event.payload.mime_type

        # Block dangerous types
        if detected_mime in self.ALWAYS_BLOCKED_MIME_TYPES:
            await self.db.execute(
                update(File)
                .where(File.id == event.payload.file_id)
                .values(status=FileStatus.QUARANTINED)
            )
            raise PermanentFailure(
                f"File type '{detected_mime}' is not permitted",
                event_id=event.event_id,
            )

        # Update verified MIME type on file
        await self.db.execute(
            update(File)
            .where(File.id == event.payload.file_id)
            .values(mime_type_verified=detected_mime)
        )

        return {
            "declared_mime": declared_mime,
            "detected_mime": detected_mime,
            "mime_match": declared_mime == detected_mime,
            "allowed": True,
        }
```

---

## 7. OCR Stage

```python
import pytesseract
from PIL import Image
import fitz  # PyMuPDF

class OCRStage(PipelineStage):
    name = "ocr"

    def should_skip(self, mime_type: str) -> bool:
        OCR_SUPPORTED = {
            "application/pdf",
            "image/jpeg", "image/png", "image/gif", "image/tiff",
            "image/webp", "image/bmp",
        }
        return mime_type not in OCR_SUPPORTED

    async def execute(self, event: FileUploadedEvent) -> dict:
        if self.should_skip(event.payload.mime_type):
            return {"skipped": True, "reason": "unsupported_mime_type"}

        file_bytes = await self.download_file(event.payload.storage_key)

        ocr_result = await self._extract_text(
            file_bytes, event.payload.mime_type
        )

        # Store OCR text in a dedicated table for large text
        await self._store_ocr_text(event.payload.file_id, ocr_result.text)

        return {
            "provider": "tesseract",
            "version": pytesseract.get_tesseract_version(),
            "text_length": len(ocr_result.text),
            "word_count": len(ocr_result.text.split()),
            "page_count": ocr_result.page_count,
            "language": ocr_result.language,
            "confidence": ocr_result.average_confidence,
        }

    async def _extract_text(
        self, file_bytes: bytes, mime_type: str
    ) -> OCRResult:
        if mime_type == "application/pdf":
            return await self._extract_from_pdf(file_bytes)
        else:
            return await self._extract_from_image(file_bytes)

    async def _extract_from_pdf(self, pdf_bytes: bytes) -> OCRResult:
        loop = asyncio.get_event_loop()

        def _process():
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            all_text = []
            page_count = len(doc)

            for page_num in range(min(page_count, 50)):  # Max 50 pages
                page = doc.load_page(page_num)

                # Try text layer first (fast)
                text = page.get_text("text")
                if len(text.strip()) > 50:  # Has embedded text
                    all_text.append(text)
                    continue

                # Fall back to OCR for scanned pages
                pix = page.get_pixmap(dpi=150)
                img_bytes = pix.tobytes("png")
                img = Image.open(io.BytesIO(img_bytes))
                ocr_text = pytesseract.image_to_string(
                    img, config="--psm 1 --oem 3"
                )
                all_text.append(ocr_text)

            return OCRResult(
                text="\n\n".join(all_text),
                page_count=page_count,
                language="en",
            )

        return await loop.run_in_executor(None, _process)

    async def _extract_from_image(self, image_bytes: bytes) -> OCRResult:
        loop = asyncio.get_event_loop()

        def _process():
            img = Image.open(io.BytesIO(image_bytes))
            data = pytesseract.image_to_data(
                img,
                output_type=pytesseract.Output.DICT,
                config="--psm 1 --oem 3",
            )
            text = pytesseract.image_to_string(img)
            confidences = [
                int(c) for c in data["conf"] if int(c) > 0
            ]
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0

            return OCRResult(
                text=text,
                page_count=1,
                language="en",
                average_confidence=avg_confidence / 100,
            )

        return await loop.run_in_executor(None, _process)

    async def _store_ocr_text(self, file_id: str, text: str) -> None:
        """Store OCR text for search indexing."""
        await self.db.execute(
            insert(OCRText)
            .values(file_id=file_id, text=text, extracted_at=datetime.utcnow())
            .on_conflict_do_update(
                index_elements=["file_id"],
                set_={"text": text, "extracted_at": datetime.utcnow()},
            )
        )
```

---

## 8. PHI Detection Stage

```python
from presidio_analyzer import AnalyzerEngine

class PHIDetectionStage(PipelineStage):
    name = "phi_detection"

    PHI_ENTITIES = [
        "PERSON", "DATE_TIME", "US_SSN", "US_DRIVER_LICENSE",
        "US_PASSPORT", "PHONE_NUMBER", "EMAIL_ADDRESS", "LOCATION",
        "MEDICAL_LICENSE", "IP_ADDRESS", "URL", "CRYPTO",
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.analyzer = AnalyzerEngine()

    async def execute(self, event: FileUploadedEvent) -> dict:
        # Get OCR text from previous stage
        ocr_text = await self._get_ocr_text(event.payload.file_id)
        if not ocr_text:
            return {"skipped": True, "reason": "no_ocr_text"}

        results = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self.analyzer.analyze(
                text=ocr_text,
                entities=self.PHI_ENTITIES,
                language="en",
            )
        )

        entities_found = [
            {"type": r.entity_type, "score": round(r.score, 3)}
            for r in results
            if r.score > 0.7
        ]

        phi_detected = bool(entities_found)
        entity_types = list({e["type"] for e in entities_found})

        # Update file record
        await self.db.execute(
            update(File)
            .where(File.id == event.payload.file_id)
            .values(
                phi_detected=phi_detected,
                phi_entity_types=entity_types,
            )
        )

        # Take configured action
        await self._take_action(
            event, phi_detected, entity_types
        )

        return {
            "phi_detected": phi_detected,
            "entity_types": entity_types,
            "entity_count": len(entities_found),
            "high_confidence_count": sum(1 for e in entities_found if e["score"] > 0.9),
        }

    async def _take_action(
        self,
        event: FileUploadedEvent,
        phi_detected: bool,
        entity_types: list[str],
    ) -> None:
        if not phi_detected:
            return

        project_config = await get_project_config(event.project_id)
        action = project_config.processing.phi_action

        if action == "quarantine":
            await self.db.execute(
                update(File)
                .where(File.id == event.payload.file_id)
                .values(status=FileStatus.QUARANTINED)
            )
        elif action == "flag":
            # Add tag to file
            await self.db.execute(
                update(File)
                .where(File.id == event.payload.file_id)
                .values(
                    tags=func.array_append(File.tags, "phi-detected")
                )
            )
        # "log" and "block" handled elsewhere
```

---

## 9. PII Detection Stage

```python
class PIIDetectionStage(PipelineStage):
    name = "pii_detection"

    # PII entities (non-healthcare, broader detection)
    PII_ENTITIES = [
        "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER",
        "US_SSN", "CREDIT_CARD", "IP_ADDRESS",
        "LOCATION", "DATE_TIME", "NRP",  # Nationality, Religion, Political
    ]

    async def execute(self, event: FileUploadedEvent) -> dict:
        ocr_text = await self._get_ocr_text(event.payload.file_id)
        if not ocr_text:
            return {"skipped": True, "reason": "no_ocr_text"}

        results = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: self.analyzer.analyze(
                text=ocr_text, entities=self.PII_ENTITIES, language="en"
            )
        )

        entities = [
            {"type": r.entity_type, "score": round(r.score, 3)}
            for r in results if r.score > 0.7
        ]

        pii_detected = bool(entities)

        await self.db.execute(
            update(File)
            .where(File.id == event.payload.file_id)
            .values(pii_detected=pii_detected)
        )

        return {
            "pii_detected": pii_detected,
            "entity_types": list({e["type"] for e in entities}),
            "entity_count": len(entities),
        }
```

---

## 10. Classification Stage

```python
class ClassificationStage(PipelineStage):
    name = "classification"

    CLASSIFICATION_LABELS = {
        "application/pdf": [
            "medical_discharge", "medical_lab_report", "medical_consent",
            "medical_imaging", "legal_contract", "legal_filing",
            "financial_invoice", "financial_statement", "general_document",
        ],
        "image/*": ["medical_image", "photo", "screenshot", "document_scan"],
    }

    async def execute(self, event: FileUploadedEvent) -> dict:
        # Use combination of metadata + OCR text for classification
        ocr_text = await self._get_ocr_text(event.payload.file_id) or ""
        file_metadata = event.payload.metadata

        # Rule-based classification first (fast, high confidence)
        classification = self._classify_by_metadata(file_metadata)
        confidence = 1.0
        method = "metadata"

        # If metadata-based classification fails, use ML (slower)
        if not classification and ocr_text:
            classification, confidence = await self._classify_by_content(
                ocr_text, event.payload.mime_type
            )
            method = "content"

        if not classification:
            classification = "general_document"
            confidence = 0.5
            method = "default"

        await self.db.execute(
            update(File)
            .where(File.id == event.payload.file_id)
            .values(classification=classification)
        )

        return {
            "classification": classification,
            "confidence": confidence,
            "method": method,
        }

    def _classify_by_metadata(self, metadata: dict) -> str | None:
        doc_type = metadata.get("documentType", "").lower()
        type_map = {
            "labreport": "medical_lab_report",
            "discharge": "medical_discharge",
            "consent": "medical_consent",
            "imaging": "medical_imaging",
        }
        return type_map.get(doc_type.replace("_", "").replace(" ", ""))
```

---

## 11. Thumbnail Generation Stage

```python
from PIL import Image
import fitz

class ThumbnailStage(PipelineStage):
    name = "thumbnail"

    SIZES = [128, 256, 512]  # Configurable from project config

    async def execute(self, event: FileUploadedEvent) -> dict:
        if self.should_skip(event.payload.mime_type):
            return {"skipped": True}

        file_bytes = await self.download_file(event.payload.storage_key)
        thumbnails_created = []

        for size in self.SIZES:
            thumbnail_key = self._thumbnail_key(
                event.payload.storage_key, size
            )
            thumbnail_bytes = await self._generate_thumbnail(
                file_bytes, event.payload.mime_type, size
            )

            await self.storage.upload(
                key=thumbnail_key,
                data=thumbnail_bytes,
                content_type="image/webp",
            )
            thumbnails_created.append({"size": size, "key": thumbnail_key})

        # Store thumbnail keys on file record
        await self.db.execute(
            update(File)
            .where(File.id == event.payload.file_id)
            .values(
                metadata=File.metadata.op("||")(
                    json.dumps({"_thumbnails": thumbnails_created})
                )
            )
        )

        return {"thumbnails_created": thumbnails_created}

    def _thumbnail_key(self, original_key: str, size: int) -> str:
        parts = original_key.rsplit("/", 1)
        return f"{parts[0]}/thumbs/{size}px.webp"

    async def _generate_thumbnail(
        self, file_bytes: bytes, mime_type: str, size: int
    ) -> bytes:
        loop = asyncio.get_event_loop()

        def _process():
            if mime_type == "application/pdf":
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                page = doc.load_page(0)
                pix = page.get_pixmap(dpi=72)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            else:
                img = Image.open(io.BytesIO(file_bytes))

            img.thumbnail((size, size), Image.Resampling.LANCZOS)
            output = io.BytesIO()
            img.save(output, format="WEBP", quality=85, optimize=True)
            return output.getvalue()

        return await loop.run_in_executor(None, _process)
```

---

## 12. Embedding Generation Stage

```python
class EmbeddingStage(PipelineStage):
    name = "embedding"

    MAX_TEXT_LENGTH = 8000  # Tokens

    async def execute(self, event: FileUploadedEvent) -> dict:
        ocr_text = await self._get_ocr_text(event.payload.file_id)
        if not ocr_text or len(ocr_text) < 100:
            return {"skipped": True, "reason": "insufficient_text"}

        # Truncate if too long
        text = ocr_text[:32000]  # ~8000 tokens

        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=self.settings.openai_api_key)

        response = await client.embeddings.create(
            input=text,
            model="text-embedding-3-small",
        )
        embedding = response.data[0].embedding

        # Store embedding in OpenSearch
        await self.search_indexer.update_embedding(
            file_id=event.payload.file_id,
            project_id=event.project_id,
            embedding=embedding,
        )

        return {
            "model": "text-embedding-3-small",
            "dimensions": len(embedding),
            "text_length": len(text),
        }
```

---

## 13. Indexing Stage

```python
class IndexingStage(PipelineStage):
    name = "indexing"

    async def execute(self, event: FileUploadedEvent) -> dict:
        file = await self.db.get(File, event.payload.file_id)
        processing_results = await self._get_all_stage_results(
            event.payload.file_id
        )

        doc = FileIndexDocument.from_file_and_processing(
            file, processing_results
        )

        await self.search_indexer.index_file(
            file_id=event.payload.file_id,
            project_id=event.project_id,
            doc=doc,
        )

        # Update file status to ready
        await self.db.execute(
            update(File)
            .where(File.id == event.payload.file_id)
            .values(status=FileStatus.READY)
        )

        return {
            "index_name": f"filenest-{event.project_id}",
            "indexed_at": datetime.utcnow().isoformat(),
        }
```

---

## 14. Retry and Failure Handling

### 14.1 Stage-Level Retry

```python
async def _run_stage_with_retry(
    self,
    stage: PipelineStage,
    event: FileUploadedEvent,
    max_retries: int = 2,
) -> dict | None:
    for attempt in range(max_retries + 1):
        try:
            return await stage.execute(event)
        except PermanentFailure:
            raise  # Don't retry permanent failures
        except Exception as e:
            if attempt == max_retries:
                logger.error(
                    "stage_permanently_failed",
                    stage=stage.name,
                    file_id=event.payload.file_id,
                    attempts=attempt + 1,
                    error=str(e),
                )
                await self._record_stage_failure(
                    event.payload.file_id, stage.name, str(e)
                )
                return None  # Continue with other stages
            else:
                delay = 5 * (2 ** attempt)  # 5s, 10s
                await asyncio.sleep(delay)
```

### 14.2 Failure Impact Matrix

| Stage Failure | File Status | Impact |
|--------------|-------------|--------|
| virus_scan FAILED | stays processing | File blocked from download until re-scan |
| virus_scan INFECTED | quarantined | File cannot be downloaded |
| mime_validation BLOCKED | quarantined | File cannot be downloaded |
| ocr FAILED | processing continues | No OCR search, file still downloadable |
| phi_detection FAILED | processing continues | PHI status unknown, file downloadable |
| classification FAILED | processing continues | No classification tag |
| thumbnail FAILED | processing continues | No preview, file still downloadable |
| indexing FAILED | processing continues | File not searchable (retry triggered) |

### 14.3 Dead Job Handling

```python
# Background job: find stuck processing jobs
async def check_stuck_jobs() -> None:
    stuck_threshold = datetime.utcnow() - timedelta(minutes=30)

    stuck_jobs = await db.execute(
        select(ProcessingJob)
        .where(
            ProcessingJob.status == "running",
            ProcessingJob.started_at < stuck_threshold,
        )
    )

    for job in stuck_jobs.scalars():
        if job.attempt_count < job.max_attempts:
            job.status = "pending"  # Re-queue
            job.attempt_count += 1
            await publish_retry_event(job)
        else:
            job.status = "failed"
            await notify_admin(job)
```
