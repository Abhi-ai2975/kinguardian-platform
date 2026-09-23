"""
filenest.namespaces.folders — Folder management for the FileNest Python SDK.

Supports creating folders, resolving paths, idempotent path creation, listing
files inside a folder, and deleting folders.

Usage:
    from filenest import FileNest

    fn = FileNest(api_key="fn_live_...", project_id="proj_...")

    # Ensure a per-user folder hierarchy exists (idempotent)
    folder = fn.folders.ensure_path("users/alice/uploads")

    # Resolve a path to its folder record
    folder = fn.folders.get_by_path("users/alice/uploads")

    # List files inside a folder
    result = fn.folders.list_files(folder.id, limit=20)
"""

from __future__ import annotations

from typing import Any


class FoldersNamespace:
    """Synchronous folder operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    def create(
        self,
        name: str,
        *,
        parent_folder_id: str | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """
        Create a new folder.

        Args:
            name:             Folder display name.
            parent_folder_id: ID of the parent folder; omit for root-level.
            metadata:         Arbitrary key-value metadata.

        Returns:
            Folder record dict.
        """
        body = {"name": name}
        if parent_folder_id is not None:
            body["parent_folder_id"] = parent_folder_id
        if metadata is not None:
            body["metadata"] = metadata
        return self._http.post(f"/v1/projects/{self._project_id}/folders", json=body)

    def list(self, *, name: str | None = None) -> dict:
        """
        List all folders in the project.

        Args:
            name: Optional exact name filter.

        Returns:
            Dict with ``items`` list of folder records.
        """
        params = {}
        if name is not None:
            params["name"] = name
        return self._http.get(f"/v1/projects/{self._project_id}/folders", params=params)

    def get(self, folder_id: str) -> dict:
        """
        Fetch a single folder by ID.

        Args:
            folder_id: Folder ID.

        Returns:
            Folder record dict.

        Raises:
            FileNestError: 404 if the folder does not exist.
        """
        return self._http.get(f"/v1/projects/{self._project_id}/folders/{folder_id}")

    def get_by_path(self, path: str) -> dict | None:
        """
        Resolve a slash-separated path string to the matching folder.

        Args:
            path: Path string, e.g. ``"users/alice/uploads"``.

        Returns:
            Folder record dict, or ``None`` if the path does not exist.
        """
        try:
            return self._http.get(
                f"/v1/projects/{self._project_id}/folders/by-path",
                params={"path": path},
            )
        except Exception as exc:
            if getattr(exc, "status_code", None) == 404:
                return None
            raise

    def ensure_path(self, path: str) -> dict:
        """
        Idempotently create every missing segment of a path and return the leaf folder.

        If the full path already exists the existing leaf folder is returned unchanged.
        Missing intermediate segments are created automatically.

        Args:
            path: Slash-separated path, e.g. ``"users/alice/uploads"``.

        Returns:
            Leaf folder record dict.
        """
        return self._http.post(
            f"/v1/projects/{self._project_id}/folders/ensure-path",
            json={"path": path},
        )

    def list_files(
        self,
        folder_id: str,
        *,
        q: str | None = None,
        tags: list[str] | None = None,
        category: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
        cursor: str | None = None,
    ) -> dict:
        """
        List files directly inside a folder with optional filters.

        Args:
            folder_id: Folder to list files from.
            q:         Filename substring search.
            tags:      File must have ALL these tags.
            category:  Exact category match.
            status:    Exact status match.
            limit:     Page size (1–200).
            offset:    Records to skip (page-table style).
            cursor:    Last file ID from previous page (infinite-scroll style).

        Returns:
            Dict with ``items`` list of file records and ``total`` count.
        """
        params: dict = {"limit": limit, "offset": offset}
        if q is not None:
            params["q"] = q
        if tags is not None:
            params["tags"] = tags
        if category is not None:
            params["category"] = category
        if status is not None:
            params["status"] = status
        if cursor is not None:
            params["cursor"] = cursor
        return self._http.get(
            f"/v1/projects/{self._project_id}/folders/{folder_id}/files",
            params=params,
        )

    def delete(self, folder_id: str) -> dict:
        """
        Soft-delete a folder. Fails with 409 if it contains files or subfolders.

        Args:
            folder_id: Folder to delete.

        Returns:
            Deletion confirmation dict.
        """
        return self._http.delete(f"/v1/projects/{self._project_id}/folders/{folder_id}")


class AsyncFoldersNamespace:
    """Asynchronous folder operations."""

    def __init__(self, http: Any, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    async def create(
        self,
        name: str,
        *,
        parent_folder_id: str | None = None,
        metadata: dict | None = None,
    ) -> dict:
        """Create a new folder (async). See FoldersNamespace.create for full docs."""
        body = {"name": name}
        if parent_folder_id is not None:
            body["parent_folder_id"] = parent_folder_id
        if metadata is not None:
            body["metadata"] = metadata
        return await self._http.post(f"/v1/projects/{self._project_id}/folders", json=body)

    async def list(self, *, name: str | None = None) -> dict:
        """List all folders in the project (async). See FoldersNamespace.list for full docs."""
        params = {}
        if name is not None:
            params["name"] = name
        return await self._http.get(f"/v1/projects/{self._project_id}/folders", params=params)

    async def get(self, folder_id: str) -> dict:
        """Fetch a single folder by ID (async)."""
        return await self._http.get(f"/v1/projects/{self._project_id}/folders/{folder_id}")

    async def get_by_path(self, path: str) -> dict | None:
        """Resolve a path string to the matching folder (async). Returns None if not found."""
        try:
            return await self._http.get(
                f"/v1/projects/{self._project_id}/folders/by-path",
                params={"path": path},
            )
        except Exception as exc:
            if getattr(exc, "status_code", None) == 404:
                return None
            raise

    async def ensure_path(self, path: str) -> dict:
        """Idempotently create every missing path segment (async). See FoldersNamespace.ensure_path."""
        return await self._http.post(
            f"/v1/projects/{self._project_id}/folders/ensure-path",
            json={"path": path},
        )

    async def list_files(
        self,
        folder_id: str,
        *,
        q: str | None = None,
        tags: list[str] | None = None,
        category: str | None = None,
        status: str | None = None,
        limit: int = 50,
        offset: int = 0,
        cursor: str | None = None,
    ) -> dict:
        """List files inside a folder (async). See FoldersNamespace.list_files for full docs."""
        params: dict = {"limit": limit, "offset": offset}
        if q is not None:
            params["q"] = q
        if tags is not None:
            params["tags"] = tags
        if category is not None:
            params["category"] = category
        if status is not None:
            params["status"] = status
        if cursor is not None:
            params["cursor"] = cursor
        return await self._http.get(
            f"/v1/projects/{self._project_id}/folders/{folder_id}/files",
            params=params,
        )

    async def delete(self, folder_id: str) -> dict:
        """Soft-delete a folder (async). Fails with 409 if it contains files or subfolders."""
        return await self._http.delete(f"/v1/projects/{self._project_id}/folders/{folder_id}")
