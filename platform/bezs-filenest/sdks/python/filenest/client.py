"""
filenest.client — FileNest (sync) and AsyncFileNest (async) client classes.

Usage:
    from filenest import FileNest, AsyncFileNest

    # Sync
    fn = FileNest(api_key="fn_live_...", project_id="proj_...")
    file = fn.files.upload(filename="report.pdf", data=pdf_bytes)

    # Resumable multipart
    session = fn.uploads.create(filename="video.mp4", size_bytes=len(data))
    fn.uploads.resume(session["upload_id"], data=data)

    # Async (context manager recommended)
    async with AsyncFileNest(api_key="fn_live_...", project_id="proj_...") as fn:
        file = await fn.files.upload(filename="report.pdf", data=pdf_bytes)
"""

from __future__ import annotations

from filenest.http.client import FileNestHttpClient
from filenest.http.async_client import AsyncFileNestHttpClient
from filenest.namespaces.files import FilesNamespace, AsyncFilesNamespace
from filenest.namespaces.folders import FoldersNamespace, AsyncFoldersNamespace
from filenest.namespaces.search import SearchNamespace, AsyncSearchNamespace
from filenest.namespaces.upload_tokens import UploadTokensNamespace, AsyncUploadTokensNamespace
from filenest.namespaces.uploads import UploadsNamespace, AsyncUploadsNamespace
from filenest.namespaces.webhooks import WebhooksNamespace, AsyncWebhooksNamespace


class FileNest:
    """Synchronous FileNest SDK client."""

    def __init__(
        self,
        api_key: str,
        project_id: str,
        base_url: str = "https://api.filenest.io",
        timeout: float = 30.0,
        max_retries: int = 3,
    ) -> None:
        self._http = FileNestHttpClient(
            api_key=api_key,
            project_id=project_id,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )
        self.files = FilesNamespace(self._http, project_id)
        self.folders = FoldersNamespace(self._http, project_id)
        self.uploads = UploadsNamespace(self._http, project_id)
        self.search = SearchNamespace(self._http, project_id)
        self.upload_tokens = UploadTokensNamespace(self._http, project_id)
        self.webhooks = WebhooksNamespace(self._http, project_id)

    def close(self) -> None:
        """Close the underlying HTTP client."""
        self._http.close()

    def __enter__(self) -> FileNest:
        return self

    def __exit__(self, *_) -> None:
        self.close()


class AsyncFileNest:
    """Asynchronous FileNest SDK client."""

    def __init__(
        self,
        api_key: str,
        project_id: str,
        base_url: str = "https://api.filenest.io",
        timeout: float = 30.0,
        max_retries: int = 3,
    ) -> None:
        self._http = AsyncFileNestHttpClient(
            api_key=api_key,
            project_id=project_id,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
        )
        self.files = AsyncFilesNamespace(self._http, project_id)
        self.folders = AsyncFoldersNamespace(self._http, project_id)
        self.uploads = AsyncUploadsNamespace(self._http, project_id)
        self.search = AsyncSearchNamespace(self._http, project_id)
        self.upload_tokens = AsyncUploadTokensNamespace(self._http, project_id)
        self.webhooks = AsyncWebhooksNamespace(self._http, project_id)

    async def aclose(self) -> None:
        """Close the underlying async HTTP client."""
        await self._http.aclose()

    async def __aenter__(self) -> AsyncFileNest:
        return self

    async def __aexit__(self, *_) -> None:
        await self.aclose()
