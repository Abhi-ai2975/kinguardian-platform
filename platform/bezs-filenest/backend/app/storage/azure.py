"""
app.storage.azure — Azure Blob Storage provider (azure-storage-blob async SDK).

Implements the StorageProvider protocol for Azure Blob. All operations use the
async aio client; presigned URLs are generated via HMAC-signed SAS tokens (no
network call required for signing).

Supports managed mode (platform account_name / account_key from env) and BYOB
mode (per-project credentials decrypted from storage_configs.config_encrypted).

Usage:
    from app.storage.azure import AzureBlobStorageProvider

    provider = AzureBlobStorageProvider(
        account_name="myaccount",
        account_key="base64key==",
        container_name="fn-project-uuid",
    )
    url = await provider.generate_presigned_upload_url(key, content_type, size_bytes)
"""
import base64
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import quote

from app.errors import StorageError

try:
    from azure.core.exceptions import AzureError, ResourceExistsError, ResourceNotFoundError
    from azure.storage.blob import BlobSasPermissions, generate_blob_sas
    from azure.storage.blob.aio import BlobServiceClient
except ImportError as exc:
    raise ImportError(
        "azure-storage-blob is required for Azure Blob Storage. "
        "Run: uv add azure-storage-blob"
    ) from exc


class AzureBlobStorageProvider:
    """
    Azure Blob Storage backend using the azure-storage-blob async SDK.

    Each public method opens a short-lived BlobServiceClient (HTTP session)
    and closes it on exit, keeping connection management simple.

    Args:
        account_name:   Azure storage account name.
        account_key:    Base64-encoded storage account key (shared-key auth).
        container_name: Target container for all operations (≈ S3 bucket).
    """

    def __init__(
        self,
        *,
        account_name: str,
        account_key: str,
        container_name: str,
    ) -> None:
        self._account_name = account_name
        self._account_key = account_key
        self._container_name = container_name
        self._account_url = f"https://{account_name}.blob.core.windows.net"

    def _client(self) -> "BlobServiceClient":
        return BlobServiceClient(
            account_url=self._account_url,
            credential=self._account_key,
        )

    async def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        size_bytes: int,
        *,
        expires_in: int = 3600,
    ) -> str:
        """Generate an HMAC-signed SAS URL for a PUT (upload) operation."""
        try:
            expiry = datetime.now(UTC) + timedelta(seconds=expires_in)
            sas_token = generate_blob_sas(
                account_name=self._account_name,
                container_name=self._container_name,
                blob_name=key,
                account_key=self._account_key,
                permission=BlobSasPermissions(write=True, create=True),
                expiry=expiry,
                content_type=content_type,
            )
            return f"{self._account_url}/{self._container_name}/{key}?{sas_token}"
        except AzureError as exc:
            raise StorageError(f"Failed to generate upload URL for '{key}'") from exc

    async def generate_presigned_download_url(
        self,
        key: str,
        *,
        filename: str | None = None,
        expires_in: int = 3600,
    ) -> str:
        """Generate an HMAC-signed SAS URL for a GET (download) operation."""
        try:
            expiry = datetime.now(UTC) + timedelta(seconds=expires_in)
            kwargs: dict[str, Any] = {}
            if filename:
                kwargs["content_disposition"] = f'attachment; filename="{filename}"'
            sas_token = generate_blob_sas(
                account_name=self._account_name,
                container_name=self._container_name,
                blob_name=key,
                account_key=self._account_key,
                permission=BlobSasPermissions(read=True),
                expiry=expiry,
                **kwargs,
            )
            return f"{self._account_url}/{self._container_name}/{key}?{sas_token}"
        except AzureError as exc:
            raise StorageError(f"Failed to generate download URL for '{key}'") from exc

    async def delete_object(self, key: str) -> None:
        """Delete a blob. Silently succeeds if the blob does not exist."""
        try:
            async with self._client() as client:
                blob_client = client.get_blob_client(
                    container=self._container_name, blob=key
                )
                await blob_client.delete_blob()
        except ResourceNotFoundError:
            pass
        except AzureError as exc:
            raise StorageError(f"Failed to delete '{key}'") from exc

    async def object_exists(self, key: str) -> bool:
        """Return True if the blob exists."""
        try:
            async with self._client() as client:
                blob_client = client.get_blob_client(
                    container=self._container_name, blob=key
                )
                return await blob_client.exists()
        except AzureError as exc:
            raise StorageError(f"Failed to check existence of '{key}'") from exc

    async def copy_object(self, source_key: str, dest_key: str) -> None:
        """
        Copy a blob within the container.

        Same-account copies complete synchronously in Azure; the copy status
        is 'success' immediately after start_copy_from_url returns.
        """
        try:
            async with self._client() as client:
                source_url = (
                    f"{self._account_url}/{self._container_name}/{source_key}"
                )
                dest_blob = client.get_blob_client(
                    container=self._container_name, blob=dest_key
                )
                await dest_blob.start_copy_from_url(source_url)
        except AzureError as exc:
            raise StorageError(f"Failed to copy '{source_key}' → '{dest_key}'") from exc

    def _block_id(self, part_number: int) -> str:
        """Return base64-encoded block ID for a part number. All IDs must be same length."""
        return base64.b64encode(str(part_number).zfill(8).encode()).decode()

    async def create_multipart_upload(self, key: str, content_type: str) -> str:
        """
        Generate a 24h SAS token for the target blob and return it as the upload_id.

        The SAS token is embedded in each part URL so the client can PUT blocks
        directly to Azure without routing bytes through our server.
        """
        try:
            expiry = datetime.now(UTC) + timedelta(hours=24)
            sas_token = generate_blob_sas(
                account_name=self._account_name,
                container_name=self._container_name,
                blob_name=key,
                account_key=self._account_key,
                permission=BlobSasPermissions(write=True, create=True),
                expiry=expiry,
                content_type=content_type,
            )
            return sas_token
        except AzureError as exc:
            raise StorageError(f"Failed to create multipart upload for '{key}'") from exc

    async def generate_presigned_part_url(
        self, key: str, upload_id: str, part_number: int, *, expires_in: int = 3600,
    ) -> str:
        """
        Return an Azure Put Block URL with the SAS token for a specific part.

        upload_id is the SAS token generated in create_multipart_upload.
        The block_id encodes the part_number so we can reconstruct the commit list.
        """
        block_id = quote(self._block_id(part_number))
        return (
            f"{self._account_url}/{self._container_name}/{key}"
            f"?comp=block&blockid={block_id}&{upload_id}"
        )

    async def complete_multipart_upload(
        self, key: str, upload_id: str, parts: list[dict],
    ) -> None:
        """
        Commit all uploaded blocks as the final blob via commit_block_list.

        ETags from the client are ignored — Azure doesn't issue per-block ETags.
        Block IDs are reconstructed from PartNumber in the parts list.
        """
        try:
            sorted_parts = sorted(parts, key=lambda x: x["PartNumber"])
            block_ids = [self._block_id(p["PartNumber"]) for p in sorted_parts]
            async with self._client() as client:
                blob_client = client.get_blob_client(
                    container=self._container_name, blob=key
                )
                await blob_client.commit_block_list(block_ids)
        except AzureError as exc:
            raise StorageError(f"Failed to complete multipart upload for '{key}'") from exc

    async def abort_multipart_upload(self, key: str, upload_id: str) -> None:
        """Delete the uncommitted blob, discarding any uploaded blocks."""
        try:
            async with self._client() as client:
                blob_client = client.get_blob_client(
                    container=self._container_name, blob=key
                )
                await blob_client.delete_blob()
        except ResourceNotFoundError:
            pass  # nothing to clean up
        except AzureError as exc:
            raise StorageError(f"Failed to abort multipart upload for '{key}'") from exc

    async def download_bytes(
        self,
        key: str,
        *,
        range_start: int | None = None,
        range_end: int | None = None,
    ) -> bytes:
        """Download blob bytes, optionally fetching a byte range."""
        try:
            offset = range_start or 0
            length = (range_end - offset + 1) if range_end is not None else None
            async with self._client() as client:
                blob_client = client.get_blob_client(
                    container=self._container_name, blob=key
                )
                stream = await blob_client.download_blob(offset=offset, length=length)
                return await stream.readall()
        except AzureError as exc:
            raise StorageError(f"Failed to download '{key}'") from exc

    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        """Upload bytes directly (used for connectivity probes and small objects)."""
        try:
            async with self._client() as client:
                blob_client = client.get_blob_client(
                    container=self._container_name, blob=key
                )
                await blob_client.upload_blob(
                    data, content_type=content_type, overwrite=True
                )
        except AzureError as exc:
            raise StorageError(f"Failed to upload '{key}'") from exc

    async def create_bucket(self, bucket_name: str) -> None:
        """
        Create an Azure container with the given name. Idempotent.

        Args:
            bucket_name: Container name to create (≈ S3 bucket name).
        """
        try:
            async with self._client() as client:
                container_client = client.get_container_client(bucket_name)
                await container_client.create_container()
        except ResourceExistsError:
            pass
        except AzureError as exc:
            raise StorageError(f"Failed to create container '{bucket_name}'") from exc

    async def set_bucket_cors(self, allowed_origins: list[str]) -> None:
        """No-op: Azure CORS is configured in the Azure Portal or via the SDK separately."""
