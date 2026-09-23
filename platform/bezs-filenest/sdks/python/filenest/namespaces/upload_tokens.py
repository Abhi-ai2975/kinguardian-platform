"""
filenest.namespaces.upload_tokens — Upload token creation for the FileNest Python SDK.

Upload tokens are short-lived credentials that allow browser clients to upload files
without exposing the project's full API key. Create them server-side and return them
to the browser; pass to ``<FileNestProvider tokenEndpoint>`` or as a Bearer token.

Usage:
    from filenest import FileNest

    fn = FileNest(api_key="fn_live_...", project_id="proj_...")
    token = fn.upload_tokens.create(
        owner_user_id="user_abc",
        owner_org_id="org_xyz",
        expires_in=3600,
    )
    print(token.token)   # fn_upload_token_<hex>
"""

from __future__ import annotations

from filenest.types import UploadToken


class UploadTokensNamespace:
    """Sync upload token operations."""

    def __init__(self, http, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    def create(
        self,
        *,
        max_size: int | None = None,
        allowed_mime_types: list[str] | None = None,
        max_files: int | None = None,
        folder_id: str | None = None,
        metadata: dict | None = None,
        tags: list[str] | None = None,
        expires_in: int = 3600,
        owner_user_id: str | None = None,
        owner_org_id: str | None = None,
    ) -> UploadToken:
        """
        Issue a short-lived upload token for browser clients.

        Args:
            max_size:           Maximum file size in bytes the token permits.
            allowed_mime_types: MIME patterns allowed (e.g. ``["image/*"]``).
            max_files:          Maximum concurrent files per token use.
            folder_id:          Default folder for uploads made with this token.
            metadata:           Default metadata applied to every uploaded file.
            tags:               Default tags merged onto every uploaded file.
            expires_in:         Token TTL in seconds (60–86400). Default: 3600.
            owner_user_id:      End-user ID embedded server-side. Copied to every
                                file uploaded with this token.
            owner_org_id:       End-user's org ID embedded server-side.

        Returns:
            UploadToken with the token string and expiry.
        """
        body = {k: v for k, v in {
            "max_size": max_size,
            "allowed_mime_types": allowed_mime_types,
            "max_files": max_files,
            "folder_id": folder_id,
            "metadata": metadata,
            "tags": tags,
            "expires_in": expires_in,
            "owner_user_id": owner_user_id,
            "owner_org_id": owner_org_id,
        }.items() if v is not None}
        raw = self._http.post(f"/v1/projects/{self._project_id}/upload-tokens", json=body)
        return UploadToken.model_validate(raw)


class AsyncUploadTokensNamespace:
    """Async upload token operations."""

    def __init__(self, http, project_id: str) -> None:
        self._http = http
        self._project_id = project_id

    async def create(
        self,
        *,
        max_size: int | None = None,
        allowed_mime_types: list[str] | None = None,
        max_files: int | None = None,
        folder_id: str | None = None,
        metadata: dict | None = None,
        tags: list[str] | None = None,
        expires_in: int = 3600,
        owner_user_id: str | None = None,
        owner_org_id: str | None = None,
    ) -> UploadToken:
        """
        Issue a short-lived upload token for browser clients (async).

        Args:
            max_size:           Maximum file size in bytes the token permits.
            allowed_mime_types: MIME patterns allowed (e.g. ``["image/*"]``).
            max_files:          Maximum concurrent files per token use.
            folder_id:          Default folder for uploads made with this token.
            metadata:           Default metadata applied to every uploaded file.
            tags:               Default tags merged onto every uploaded file.
            expires_in:         Token TTL in seconds (60–86400). Default: 3600.
            owner_user_id:      End-user ID embedded server-side. Copied to every
                                file uploaded with this token.
            owner_org_id:       End-user's org ID embedded server-side.

        Returns:
            UploadToken with the token string and expiry.
        """
        body = {k: v for k, v in {
            "max_size": max_size,
            "allowed_mime_types": allowed_mime_types,
            "max_files": max_files,
            "folder_id": folder_id,
            "metadata": metadata,
            "tags": tags,
            "expires_in": expires_in,
            "owner_user_id": owner_user_id,
            "owner_org_id": owner_org_id,
        }.items() if v is not None}
        raw = await self._http.post(f"/v1/projects/{self._project_id}/upload-tokens", json=body)
        return UploadToken.model_validate(raw)
