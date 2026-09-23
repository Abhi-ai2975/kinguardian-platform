"""
app.storage.provider — StorageProvider Protocol (interface).

Every storage backend must satisfy this Protocol. Service code always depends on
this interface — never on a concrete class like S3StorageProvider directly.

Usage:
    from app.storage.provider import StorageProvider

    provider: StorageProvider = await resolver.get_provider(project_id)
    url = await provider.generate_presigned_upload_url(key, content_type, size_bytes)
"""
from typing import Protocol, runtime_checkable


@runtime_checkable
class StorageProvider(Protocol):
    """Structural interface for all FileNest storage backends."""

    async def generate_presigned_upload_url(
        self, key: str, content_type: str, size_bytes: int, *, expires_in: int = 3600,
    ) -> str: ...

    async def generate_presigned_download_url(
        self, key: str, *, filename: str | None = None, expires_in: int = 3600,
    ) -> str: ...

    async def delete_object(self, key: str) -> None: ...

    async def object_exists(self, key: str) -> bool: ...

    async def copy_object(self, source_key: str, dest_key: str) -> None: ...

    async def download_bytes(
        self, key: str, *, range_start: int | None = None, range_end: int | None = None,
    ) -> bytes: ...

    async def create_multipart_upload(self, key: str, content_type: str) -> str: ...

    async def generate_presigned_part_url(
        self, key: str, upload_id: str, part_number: int, *, expires_in: int = 3600,
    ) -> str: ...

    async def complete_multipart_upload(
        self, key: str, upload_id: str, parts: list[dict],
    ) -> None: ...

    async def abort_multipart_upload(self, key: str, upload_id: str) -> None: ...

    async def upload(self, key: str, data: bytes, content_type: str) -> None: ...

    async def create_bucket(self, bucket_name: str) -> None: ...

    async def set_bucket_cors(self, allowed_origins: list[str]) -> None: ...
