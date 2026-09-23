# FileNest v1.0 — Preview Generation

**Version:** 1.0.0
**Status:** Approved for Engineering
**Last Updated:** 2026-06-15

---

## Table of Contents

1. [Overview](#1-overview)
2. [Supported File Types](#2-supported-file-types)
3. [Preview Pipeline Stage](#3-preview-pipeline-stage)
4. [Office Document Conversion](#4-office-document-conversion)
5. [PDF Preview](#5-pdf-preview)
6. [Image Preview](#6-image-preview)
7. [Video Preview](#7-video-preview)
8. [Audio Preview](#8-audio-preview)
9. [Preview Storage](#9-preview-storage)
10. [Preview API](#10-preview-api)
11. [Frontend Integration](#11-frontend-integration)
12. [Share Link Preview](#12-share-link-preview)

---

## 1. Overview

Preview generation produces browser-renderable versions of files so users can view content without downloading. Previews are generated asynchronously after upload as part of the processing pipeline.

**Design rules:**
- Previews are always derived from the original file — never the other way around
- Previews do not replace the original; originals are always downloadable
- Previews respect compliance constraints (a PHI-quarantined file cannot be previewed)
- Preview generation failure never blocks file availability
- Previews are cached in storage with their own keys separate from originals

---

## 2. Supported File Types

| Category | MIME Types | Preview Strategy |
|----------|-----------|-----------------|
| PDF | `application/pdf` | Serve directly — browsers render natively |
| Images | `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`, `image/tiff` | Convert TIFF to WebP; others served as-is |
| Office Docs | `application/vnd.openxmlformats-officedocument.*`, `application/msword`, `application/vnd.ms-excel`, `application/vnd.ms-powerpoint` | Convert to PDF via Gotenberg, then serve PDF |
| OpenDocument | `application/vnd.oasis.opendocument.*` | Convert to PDF via Gotenberg |
| Plain Text | `text/plain`, `text/csv`, `text/markdown` | Serve as-is with syntax highlighting in UI |
| Video | `video/mp4`, `video/webm`, `video/quicktime`, `video/x-msvideo` | Extract poster frame; serve original for playback |
| Audio | `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/aac` | Generate waveform image; serve original for playback |
| Code | `text/x-python`, `application/javascript`, `text/html` | Serve as plain text with syntax highlighting |
| Archives | `application/zip`, `application/x-tar` | Show file listing only — no content preview |
| Unsupported | All others | Generic file icon with metadata only |

---

## 3. Preview Pipeline Stage

```python
class PreviewGenerationStage(PipelineStage):
    name = "preview"

    PREVIEWABLE_MIME_TYPES = {
        "application/pdf",
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "image/tiff", "image/svg+xml",
        "video/mp4", "video/webm", "video/quicktime",
        "audio/mpeg", "audio/wav", "audio/ogg",
        "text/plain", "text/csv", "text/markdown",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/msword",
        "application/vnd.ms-excel",
    }

    async def execute(self, event: FileUploadedEvent) -> dict:
        mime_type = event.payload.mime_type

        if mime_type not in self.PREVIEWABLE_MIME_TYPES:
            return {"skipped": True, "reason": "unsupported_mime_type"}

        file_bytes = await self.download_file(event.payload.storage_key)

        strategy = self._get_strategy(mime_type)
        result = await strategy.generate(file_bytes, mime_type, event)

        await self.db.execute(
            update(File)
            .where(File.id == event.payload.file_id)
            .values(
                preview_available=result.success,
                preview_key=result.preview_key,
                preview_mime_type=result.preview_mime_type,
                preview_page_count=result.page_count,
            )
        )

        return {
            "preview_key": result.preview_key,
            "preview_mime_type": result.preview_mime_type,
            "page_count": result.page_count,
            "strategy": strategy.__class__.__name__,
        }

    def _get_strategy(self, mime_type: str) -> "PreviewStrategy":
        if mime_type == "application/pdf":
            return PDFPreviewStrategy(self.storage, self.settings)
        if mime_type.startswith("image/"):
            return ImagePreviewStrategy(self.storage, self.settings)
        if mime_type.startswith("video/"):
            return VideoPreviewStrategy(self.storage, self.settings)
        if mime_type.startswith("audio/"):
            return AudioPreviewStrategy(self.storage, self.settings)
        if mime_type.startswith("text/"):
            return TextPreviewStrategy(self.storage, self.settings)
        # Office documents
        return OfficePreviewStrategy(self.storage, self.settings)
```

---

## 4. Office Document Conversion

Office documents are converted to PDF using **Gotenberg** — a stateless Docker microservice wrapping LibreOffice.

```python
class OfficePreviewStrategy:
    """Converts Office docs to PDF via Gotenberg, then stores the PDF."""

    GOTENBERG_URL = settings.gotenberg_url  # http://gotenberg:3000

    async def generate(
        self, file_bytes: bytes, mime_type: str, event: FileUploadedEvent
    ) -> PreviewResult:
        # Send to Gotenberg for conversion
        async with httpx.AsyncClient(timeout=120) as client:
            files = {"files": (event.payload.original_filename, file_bytes, mime_type)}
            response = await client.post(
                f"{self.GOTENBERG_URL}/forms/libreoffice/convert",
                files=files,
                data={"nativePdfA1aFormat": "false"},
            )

        if response.status_code != 200:
            raise PreviewGenerationError(
                f"Gotenberg conversion failed: {response.status_code}"
            )

        pdf_bytes = response.content
        preview_key = self._preview_key(event.payload.storage_key, "preview.pdf")

        await self.storage.upload(
            key=preview_key,
            data=pdf_bytes,
            content_type="application/pdf",
        )

        # Count pages in resulting PDF
        page_count = await self._count_pdf_pages(pdf_bytes)

        return PreviewResult(
            success=True,
            preview_key=preview_key,
            preview_mime_type="application/pdf",
            page_count=page_count,
        )

    async def _count_pdf_pages(self, pdf_bytes: bytes) -> int:
        loop = asyncio.get_event_loop()
        def _count():
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            return len(doc)
        return await loop.run_in_executor(None, _count)

    def _preview_key(self, original_key: str, filename: str) -> str:
        parts = original_key.rsplit("/", 1)
        return f"{parts[0]}/previews/{filename}"
```

### 4.1 Gotenberg Deployment

```yaml
# helm/templates/gotenberg/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gotenberg
  namespace: filenest-prod
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: gotenberg
          image: gotenberg/gotenberg:8
          ports:
            - containerPort: 3000
          env:
            - name: GOTENBERG_CHROMIUM_DISABLE_ROUTES
              value: "true"   # We only need LibreOffice routes
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2"
              memory: "3Gi"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 30
```

---

## 5. PDF Preview

PDFs are stored as-is — no server-side conversion needed. The browser renders them natively via PDF.js on the frontend.

```python
class PDFPreviewStrategy:
    async def generate(
        self, file_bytes: bytes, mime_type: str, event: FileUploadedEvent
    ) -> PreviewResult:
        # Store a preview-optimized copy with content-type set for inline display
        preview_key = self._preview_key(event.payload.storage_key, "preview.pdf")

        await self.storage.upload(
            key=preview_key,
            data=file_bytes,
            content_type="application/pdf",
            metadata={"Content-Disposition": "inline"},
        )

        page_count = await self._count_pdf_pages(file_bytes)

        return PreviewResult(
            success=True,
            preview_key=preview_key,
            preview_mime_type="application/pdf",
            page_count=page_count,
        )
```

---

## 6. Image Preview

```python
class ImagePreviewStrategy:
    MAX_PREVIEW_DIMENSION = 2048  # px — cap to prevent huge preview files

    async def generate(
        self, file_bytes: bytes, mime_type: str, event: FileUploadedEvent
    ) -> PreviewResult:
        loop = asyncio.get_event_loop()

        def _process():
            img = Image.open(io.BytesIO(file_bytes))

            # Convert to RGB if needed (handles RGBA, P mode, etc.)
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            # Resize if too large
            if max(img.size) > self.MAX_PREVIEW_DIMENSION:
                img.thumbnail(
                    (self.MAX_PREVIEW_DIMENSION, self.MAX_PREVIEW_DIMENSION),
                    Image.Resampling.LANCZOS,
                )

            output = io.BytesIO()
            img.save(output, format="WEBP", quality=90, optimize=True)
            return output.getvalue()

        preview_bytes = await loop.run_in_executor(None, _process)
        preview_key = self._preview_key(event.payload.storage_key, "preview.webp")

        await self.storage.upload(
            key=preview_key,
            data=preview_bytes,
            content_type="image/webp",
        )

        return PreviewResult(
            success=True,
            preview_key=preview_key,
            preview_mime_type="image/webp",
            page_count=1,
        )
```

---

## 7. Video Preview

For video, FileNest extracts a poster frame (thumbnail at 5-second mark) and stores the original for browser playback. Video transcoding is out of scope for v1.

```python
class VideoPreviewStrategy:
    POSTER_FRAME_TIME = 5  # seconds

    async def generate(
        self, file_bytes: bytes, mime_type: str, event: FileUploadedEvent
    ) -> PreviewResult:
        # Write to temp file — ffmpeg needs a file path
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            poster_bytes = await self._extract_poster_frame(tmp_path)
        finally:
            os.unlink(tmp_path)

        poster_key = self._preview_key(event.payload.storage_key, "poster.webp")
        await self.storage.upload(
            key=poster_key,
            data=poster_bytes,
            content_type="image/webp",
        )

        return PreviewResult(
            success=True,
            preview_key=poster_key,
            preview_mime_type="image/webp",
            page_count=None,
            extra={"playback_key": event.payload.storage_key},
        )

    async def _extract_poster_frame(self, video_path: str) -> bytes:
        loop = asyncio.get_event_loop()

        def _run_ffmpeg():
            output = io.BytesIO()
            (
                ffmpeg
                .input(video_path, ss=self.POSTER_FRAME_TIME)
                .filter("scale", 1280, -1)
                .output("pipe:", vframes=1, format="image2", vcodec="webp")
                .run(capture_stdout=True, capture_stderr=True)
            )
            return output.getvalue()

        import ffmpeg
        result = await loop.run_in_executor(None, lambda: (
            ffmpeg
            .input(video_path, ss=self.POSTER_FRAME_TIME)
            .filter("scale", 1280, -1)
            .output("pipe:", vframes=1, format="image2", vcodec="png")
            .run(capture_stdout=True, capture_stderr=True)
        ))
        # Convert PNG → WebP
        img = Image.open(io.BytesIO(result[0]))
        out = io.BytesIO()
        img.save(out, format="WEBP", quality=85)
        return out.getvalue()
```

---

## 8. Audio Preview

```python
class AudioPreviewStrategy:
    """Generates a waveform image for audio files."""

    async def generate(
        self, file_bytes: bytes, mime_type: str, event: FileUploadedEvent
    ) -> PreviewResult:
        waveform_bytes = await self._generate_waveform(file_bytes)
        waveform_key = self._preview_key(event.payload.storage_key, "waveform.png")

        await self.storage.upload(
            key=waveform_key,
            data=waveform_bytes,
            content_type="image/png",
        )

        return PreviewResult(
            success=True,
            preview_key=waveform_key,
            preview_mime_type="image/png",
            extra={"playback_key": event.payload.storage_key},
        )

    async def _generate_waveform(self, audio_bytes: bytes) -> bytes:
        loop = asyncio.get_event_loop()

        def _process():
            import numpy as np
            import soundfile as sf

            audio_data, sample_rate = sf.read(io.BytesIO(audio_bytes))
            if audio_data.ndim > 1:
                audio_data = audio_data.mean(axis=1)  # Mono

            # Downsample to 1000 points for waveform
            chunk_size = max(1, len(audio_data) // 1000)
            chunks = np.array_split(audio_data, len(audio_data) // chunk_size)
            amplitudes = [np.abs(chunk).max() for chunk in chunks]

            # Render waveform as image
            img = Image.new("RGB", (1000, 200), color=(15, 15, 20))
            from PIL import ImageDraw
            draw = ImageDraw.Draw(img)
            mid = 100
            for i, amp in enumerate(amplitudes):
                height = int(amp * 80)
                draw.line([(i, mid - height), (i, mid + height)], fill=(99, 179, 237))

            out = io.BytesIO()
            img.save(out, format="PNG")
            return out.getvalue()

        return await loop.run_in_executor(None, _process)
```

---

## 9. Preview Storage

Preview files are stored under the same org/project/env prefix as the original but in a `previews/` subdirectory:

```
Original: /{org_id}/{proj_id}/{env}/{year}/{month}/{file_id}/{version_id}/{filename}
Preview:  /{org_id}/{proj_id}/{env}/{year}/{month}/{file_id}/{version_id}/previews/preview.pdf
Poster:   /{org_id}/{proj_id}/{env}/{year}/{month}/{file_id}/{version_id}/previews/poster.webp
```

Preview files:
- Are never directly exposed — always served via signed URLs
- Inherit the same encryption key as the original file
- Are deleted when the original file is deleted
- Do not count toward the file's version history

---

## 10. Preview API

```
GET /v1/files/{file_id}/preview

Response:
{
  "file_id": "file_abc",
  "preview_available": true,
  "preview_mime_type": "application/pdf",
  "page_count": 12,
  "preview_url": "https://signed-url...",   // Signed URL, 1-hour TTL
  "poster_url": null,
  "playback_url": null
}

// Video example:
{
  "preview_available": true,
  "preview_mime_type": "image/webp",   // poster frame
  "poster_url": "https://signed-url-poster...",
  "playback_url": "https://signed-url-original..."  // Original video for <video> tag
}

// Not yet processed:
{
  "preview_available": false,
  "preview_status": "processing",
  "estimated_ready_at": "2026-06-15T10:05:00Z"
}
```

---

## 11. Frontend Integration

```tsx
// @filenest/react — FilePreview component
import { FilePreview } from "@filenest/react"

<FilePreview
  fileId="file_abc"
  height={600}
  onLoad={() => console.log("preview loaded")}
  onError={(err) => console.error(err)}
  toolbar={{
    download: true,
    zoom: true,
    print: false,   // Disable for PHI-sensitive files
    fullscreen: true,
  }}
/>
```

Internally, `FilePreview`:
1. Calls `GET /v1/files/{id}/preview` to get the signed preview URL
2. Routes to the correct viewer based on `preview_mime_type`:
   - PDF → `<iframe>` with PDF.js
   - Image → `<img>` tag with zoom controls
   - Video → `<video>` tag with controls
   - Audio → `<audio>` tag with waveform overlay
   - Text → `<pre>` with syntax highlighting (highlight.js)
   - Not available → placeholder with file icon + metadata

---

## 12. Share Link Preview

When a user visits a share link, they see a preview before downloading:

```
https://share.filenest.io/s/{token}

Page layout:
┌────────────────────────────────────────────┐
│ FileNest Share                    [Download]│
├────────────────────────────────────────────┤
│                                            │
│         [Document Preview]                 │
│         (PDF.js / img / video)             │
│                                            │
├────────────────────────────────────────────┤
│ discharge-summary.pdf  │  245 KB  │  PDF   │
│ Shared by: ACME Health │  Expires: June 18 │
└────────────────────────────────────────────┘
```

The share page frontend calls `/s/{token}` to get preview metadata and renders the appropriate viewer using the same signed preview URL flow. The preview access is logged in the audit trail separately from the download action.
