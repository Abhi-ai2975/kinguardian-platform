"""
filenest.namespaces.files — FilesNamespace (sync) and AsyncFilesNamespace.

Upload flow (both single and async):
  1. POST JSON to /files/upload   → receive {file_id, upload_url, expires_at}
  2. PUT bytes to upload_url      → write directly to storage (S3/MinIO/etc.)
  3. POST /files/{id}/confirm     → triggers the processing pipeline
  4. GET /files/{id}              → return fully-populated File record

Files >= 5 MB (MULTIPART_THRESHOLD) are uploaded via the multipart endpoint.

Usage:
    fn.files.upload(filename="report.pdf", data=pdf_bytes, mime_type="application/pdf")
"""

from __future__ import annotations

import hashlib
import hmac
from pathlib import Path
from typing import Any, BinaryIO, Callable

import httpx

from filenest.types import (
    DownloadUrlResponse,
    File,
    FileListResponse,
    FileVersion,
    FileVersionListResponse,
)

MULTIPART_THRESHOLD = 5 * 1024 * 1024  # 5 MB
CHUNK_SIZE = 5 * 1024 * 1024


class FilesNamespace:
    """Synchronous file operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    def upload(
        self,
        filename: str,
        data: bytes | BinaryIO,
        mime_type: str = "application/octet-stream",
        folder_id: str | None = None,
        metadata: dict | None = None,
        tags: list[str] | None = None,
        on_progress: Callable[[float], None] | None = None,
    ) -> File:
        """Upload a file. Uses init → PUT-to-presigned-URL → confirm flow."""
        raw = data if isinstance(data, bytes) else data.read()

        # 1. Init: get presigned upload URL from backend
        body: dict[str, Any] = {
            "filename": filename,
            "content_type": mime_type,
            "size_bytes": len(raw),
        }
        if folder_id:
            body["folder_id"] = folder_id
        if metadata:
            body["metadata"] = metadata
        if tags:
            body["tags"] = tags

        init = self._http.post(
            f"/v1/projects/{self._project_id}/files/upload",
            json=body,
        )
        file_id = init["file_id"]
        upload_url = init["upload_url"]

        # 2. PUT bytes directly to storage
        put_resp = httpx.put(upload_url, content=raw, headers={"Content-Type": mime_type})
        put_resp.raise_for_status()

        if on_progress:
            on_progress(100.0)

        # 3. Confirm — starts pipeline
        self._http.post(f"/v1/projects/{self._project_id}/files/{file_id}/confirm")

        # 4. Return full file record
        raw_file = self._http.get(f"/v1/projects/{self._project_id}/files/{file_id}")
        return File.model_validate(raw_file)

    def upload_from_path(
        self,
        path: Path,
        mime_type: str | None = None,
        folder_id: str | None = None,
        metadata: dict | None = None,
        tags: list[str] | None = None,
        on_progress: Callable[[float], None] | None = None,
    ) -> File:
        """Upload a file from a filesystem path."""
        import mimetypes
        detected_mime = mime_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        with open(path, "rb") as f:
            return self.upload(
                filename=path.name,
                data=f.read(),
                mime_type=detected_mime,
                folder_id=folder_id,
                metadata=metadata,
                tags=tags,
                on_progress=on_progress,
            )

    def get_download_url(self, file_id: str, ttl: int = 3600) -> DownloadUrlResponse:
        """Get a presigned download URL."""
        raw = self._http.get(
            f"/v1/projects/{self._project_id}/files/{file_id}/download",
            params={"ttl": ttl},
        )
        return DownloadUrlResponse.model_validate(raw)

    def download_to_path(self, file_id: str, dest: Path) -> Path:
        """Download a file directly to a local path via presigned URL."""
        import urllib.request
        url_resp = self.get_download_url(file_id)
        urllib.request.urlretrieve(url_resp.url, dest)
        return dest

    def download_to_bytes(self, file_id: str) -> bytes:
        """Download a file to an in-memory bytes buffer."""
        import urllib.request
        url_resp = self.get_download_url(file_id)
        with urllib.request.urlopen(url_resp.url) as response:
            return response.read()

    def list(
        self,
        folder_id: str | None = None,
        mime_type: str | None = None,
        status: str | None = None,
        tags: list[str] | None = None,
        limit: int = 20,
        offset: int = 0,
        sort_by: str | None = None,
        sort_order: str | None = None,
    ) -> FileListResponse:
        """List files in the project."""
        params: dict = {"limit": limit, "offset": offset}
        if folder_id:
            params["folder_id"] = folder_id
        if mime_type:
            params["mime_type"] = mime_type
        if status:
            params["status"] = status
        if tags:
            params["tags"] = ",".join(tags)
        if sort_by:
            params["sort_by"] = sort_by
        if sort_order:
            params["sort_order"] = sort_order

        raw = self._http.get(f"/v1/projects/{self._project_id}/files", params=params)
        return FileListResponse.model_validate(raw)

    def get(self, file_id: str) -> File:
        """Get a single file by ID."""
        raw = self._http.get(f"/v1/projects/{self._project_id}/files/{file_id}")
        return File.model_validate(raw)

    def update(
        self,
        file_id: str,
        tags: list[str] | None = None,
        metadata: dict | None = None,
        filename: str | None = None,
    ) -> File:
        """Update file tags, metadata, or filename."""
        body: dict = {}
        if tags is not None:
            body["tags"] = tags
        if metadata is not None:
            body["metadata"] = metadata
        if filename is not None:
            body["filename"] = filename
        raw = self._http.patch(f"/v1/projects/{self._project_id}/files/{file_id}", json=body)
        return File.model_validate(raw)

    def delete(self, file_id: str) -> None:
        """Soft-delete a file."""
        self._http.delete(f"/v1/projects/{self._project_id}/files/{file_id}")

    def restore(self, file_id: str) -> File:
        """Restore a soft-deleted file."""
        raw = self._http.post(f"/v1/projects/{self._project_id}/files/{file_id}/restore")
        return File.model_validate(raw)

    def list_versions(self, file_id: str) -> list[FileVersion]:
        """List all versions of a file."""
        raw = self._http.get(f"/v1/projects/{self._project_id}/files/{file_id}/versions")
        resp = FileVersionListResponse.model_validate(raw)
        return resp.items

    def restore_version(self, file_id: str, version_id: str) -> dict:
        """
        Restore a file to a previous version.

        Args:
            file_id:    File whose version to restore.
            version_id: Version record ID to restore to.

        Returns:
            Dict with ``file_id`` and ``version_number`` of the restored version.
        """
        return self._http.post(
            f"/v1/projects/{self._project_id}/files/{file_id}/versions/{version_id}/restore"
        )

    @staticmethod
    def verify_webhook_signature(body: bytes, signature: str, secret: str) -> bool:
        """Verify an HMAC-SHA256 webhook signature."""
        sig = signature.removeprefix("sha256=")
        expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, sig)


class AsyncFilesNamespace:
    """Asynchronous file operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    async def upload(
        self,
        filename: str,
        data: bytes | BinaryIO,
        mime_type: str = "application/octet-stream",
        folder_id: str | None = None,
        metadata: dict | None = None,
        tags: list[str] | None = None,
    ) -> File:
        """Async upload a file. Uses init → PUT-to-presigned-URL → confirm flow."""
        import asyncio
        raw = data if isinstance(data, bytes) else data.read()

        body: dict[str, Any] = {
            "filename": filename,
            "content_type": mime_type,
            "size_bytes": len(raw),
        }
        if folder_id:
            body["folder_id"] = folder_id
        if metadata:
            body["metadata"] = metadata
        if tags:
            body["tags"] = tags

        # 1. Init
        init = await self._http.post(
            f"/v1/projects/{self._project_id}/files/upload",
            json=body,
        )
        file_id = init["file_id"]
        upload_url = init["upload_url"]

        # 2. PUT to presigned URL (run in thread to avoid blocking the event loop)
        def _put() -> None:
            resp = httpx.put(upload_url, content=raw, headers={"Content-Type": mime_type})
            resp.raise_for_status()

        await asyncio.to_thread(_put)

        # 3. Confirm
        await self._http.post(f"/v1/projects/{self._project_id}/files/{file_id}/confirm")

        # 4. Return full file record
        raw_file = await self._http.get(f"/v1/projects/{self._project_id}/files/{file_id}")
        return File.model_validate(raw_file)

    async def get_download_url(self, file_id: str, ttl: int = 3600) -> DownloadUrlResponse:
        """Get a presigned download URL (async)."""
        raw = await self._http.get(
            f"/v1/projects/{self._project_id}/files/{file_id}/download",
            params={"ttl": ttl},
        )
        return DownloadUrlResponse.model_validate(raw)

    async def list(
        self,
        folder_id: str | None = None,
        mime_type: str | None = None,
        status: str | None = None,
        tags: list[str] | None = None,
        limit: int = 20,
        offset: int = 0,
        sort_by: str | None = None,
        sort_order: str | None = None,
    ) -> FileListResponse:
        """List files (async)."""
        params: dict = {"limit": limit, "offset": offset}
        if folder_id:
            params["folder_id"] = folder_id
        if mime_type:
            params["mime_type"] = mime_type
        if status:
            params["status"] = status
        if tags:
            params["tags"] = ",".join(tags)
        if sort_by:
            params["sort_by"] = sort_by
        if sort_order:
            params["sort_order"] = sort_order
        raw = await self._http.get(f"/v1/projects/{self._project_id}/files", params=params)
        return FileListResponse.model_validate(raw)

    async def get(self, file_id: str) -> File:
        """Get a single file by ID (async)."""
        raw = await self._http.get(f"/v1/projects/{self._project_id}/files/{file_id}")
        return File.model_validate(raw)

    async def update(
        self,
        file_id: str,
        tags: list[str] | None = None,
        metadata: dict | None = None,
        filename: str | None = None,
    ) -> File:
        """Update file tags, metadata, or filename (async)."""
        body: dict = {}
        if tags is not None:
            body["tags"] = tags
        if metadata is not None:
            body["metadata"] = metadata
        if filename is not None:
            body["filename"] = filename
        raw = await self._http.patch(f"/v1/projects/{self._project_id}/files/{file_id}", json=body)
        return File.model_validate(raw)

    async def delete(self, file_id: str) -> None:
        """Soft-delete a file (async)."""
        await self._http.delete(f"/v1/projects/{self._project_id}/files/{file_id}")

    async def restore(self, file_id: str) -> File:
        """Restore a soft-deleted file (async)."""
        raw = await self._http.post(f"/v1/projects/{self._project_id}/files/{file_id}/restore")
        return File.model_validate(raw)

    async def list_versions(self, file_id: str) -> list[FileVersion]:
        """List all versions of a file (async)."""
        raw = await self._http.get(f"/v1/projects/{self._project_id}/files/{file_id}/versions")
        resp = FileVersionListResponse.model_validate(raw)
        return resp.items

    async def restore_version(self, file_id: str, version_id: str) -> dict:
        """Restore a file to a previous version (async)."""
        return await self._http.post(
            f"/v1/projects/{self._project_id}/files/{file_id}/versions/{version_id}/restore"
        )
