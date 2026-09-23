"""
filenest.namespaces.uploads — Resumable multipart upload sessions.

Use this namespace when you need manual control over the multipart session
lifecycle — for example, large files where you want to resume after a
network interruption. For most cases, ``fn.files.upload()`` handles multipart
automatically and you do not need this namespace.

Usage:
    from filenest import FileNest

    fn = FileNest(api_key="fn_live_...", project_id="proj_...")

    # 1. Create a session — store session["upload_id"] durably to resume later
    session = fn.uploads.create(
        filename="large-video.mp4",
        size_bytes=len(data),
        mime_type="video/mp4",
    )

    # 2. Upload all parts (or resume from part N)
    file = fn.uploads.resume(session["upload_id"], data=data)

    # 3. Abort if no longer needed
    fn.uploads.abort(session["upload_id"])
"""

from __future__ import annotations

import asyncio
from typing import Any, BinaryIO, Callable

import httpx

CHUNK_SIZE = 5 * 1024 * 1024  # 5 MB


class UploadsNamespace:
    """Synchronous resumable multipart upload operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    def create(
        self,
        *,
        filename: str,
        size_bytes: int,
        mime_type: str = "application/octet-stream",
        folder_id: str | None = None,
        metadata: dict | None = None,
        tags: list[str] | None = None,
    ) -> dict:
        """
        Start a new multipart upload session.

        Store the returned ``upload_id`` durably so the session can be resumed
        if the upload is interrupted.

        Args:
            filename:  Target filename in FileNest.
            size_bytes: Total file size in bytes.
            mime_type:  MIME type of the file.
            folder_id:  Destination folder ID.
            metadata:   Key-value metadata applied to the completed file.
            tags:       Tags applied to the completed file.

        Returns:
            Session dict containing ``upload_id`` and ``upload_key``.
        """
        body: dict = {
            "filename": filename,
            "content_type": mime_type,
            "total_size_bytes": size_bytes,
            "folder_id": folder_id,
            "metadata": metadata or {},
            "tags": tags or [],
        }
        return self._http.post(
            f"/v1/projects/{self._project_id}/files/upload/multipart/start",
            json=body,
        )

    def resume(
        self,
        upload_id: str,
        data: bytes | BinaryIO,
        *,
        on_progress: Callable[[float], None] | None = None,
    ) -> dict:
        """
        Upload all parts for a session and complete it.

        Can be called after ``create()`` or used to resume an interrupted
        session by supplying the same ``upload_id``.

        Args:
            upload_id:   Upload session ID from ``create()``.
            data:        File data as bytes or a readable binary stream.
            on_progress: Optional callback called with percentage (0–100) after
                         each chunk.

        Returns:
            Completed file record dict.
        """
        raw = data if isinstance(data, bytes) else data.read()
        total = len(raw)
        total_chunks = max(1, -(-total // CHUNK_SIZE))  # ceiling division
        parts: list[dict] = []

        for i in range(total_chunks):
            start = i * CHUNK_SIZE
            chunk = raw[start : start + CHUNK_SIZE]

            url_resp = self._http.get(
                f"/v1/projects/{self._project_id}/files/upload/multipart/{upload_id}/part-url",
                params={"part": i + 1},
            )
            part_res = httpx.put(url_resp["url"], content=chunk)
            part_res.raise_for_status()
            etag = part_res.headers.get("etag", "")
            parts.append({"part_number": i + 1, "etag": etag})

            if on_progress:
                on_progress(round((i + 1) / total_chunks * 100, 1))

        result = self._http.post(
            f"/v1/projects/{self._project_id}/files/upload/multipart/{upload_id}/complete",
            json={"parts": parts},
        )
        return self._http.get(f"/v1/projects/{self._project_id}/files/{result['file_id']}")

    def abort(self, upload_id: str) -> None:
        """
        Abort a multipart session and discard all uploaded parts.

        Args:
            upload_id: Upload session ID to cancel.
        """
        self._http.delete(
            f"/v1/projects/{self._project_id}/files/upload/multipart/{upload_id}"
        )


class AsyncUploadsNamespace:
    """Asynchronous resumable multipart upload operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    async def create(
        self,
        *,
        filename: str,
        size_bytes: int,
        mime_type: str = "application/octet-stream",
        folder_id: str | None = None,
        metadata: dict | None = None,
        tags: list[str] | None = None,
    ) -> dict:
        """Start a new multipart upload session (async). See UploadsNamespace.create for full docs."""
        body: dict = {
            "filename": filename,
            "content_type": mime_type,
            "total_size_bytes": size_bytes,
            "folder_id": folder_id,
            "metadata": metadata or {},
            "tags": tags or [],
        }
        return await self._http.post(
            f"/v1/projects/{self._project_id}/files/upload/multipart/start",
            json=body,
        )

    async def resume(
        self,
        upload_id: str,
        data: bytes | BinaryIO,
        *,
        on_progress: Callable[[float], None] | None = None,
    ) -> dict:
        """Upload all parts for a session and complete it (async). See UploadsNamespace.resume."""
        raw = data if isinstance(data, bytes) else data.read()
        total = len(raw)
        total_chunks = max(1, -(-total // CHUNK_SIZE))
        parts: list[dict] = []

        for i in range(total_chunks):
            start = i * CHUNK_SIZE
            chunk = raw[start : start + CHUNK_SIZE]

            url_resp = await self._http.get(
                f"/v1/projects/{self._project_id}/files/upload/multipart/{upload_id}/part-url",
                params={"part": i + 1},
            )

            def _put(u: str, c: bytes) -> str:
                resp = httpx.put(u, content=c)
                resp.raise_for_status()
                return resp.headers.get("etag", "")

            etag = await asyncio.to_thread(_put, url_resp["url"], chunk)
            parts.append({"part_number": i + 1, "etag": etag})

            if on_progress:
                on_progress(round((i + 1) / total_chunks * 100, 1))

        result = await self._http.post(
            f"/v1/projects/{self._project_id}/files/upload/multipart/{upload_id}/complete",
            json={"parts": parts},
        )
        return await self._http.get(
            f"/v1/projects/{self._project_id}/files/{result['file_id']}"
        )

    async def abort(self, upload_id: str) -> None:
        """Abort a multipart session and discard all uploaded parts (async)."""
        await self._http.delete(
            f"/v1/projects/{self._project_id}/files/upload/multipart/{upload_id}"
        )
