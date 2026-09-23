"""
app.storage.gcs — Google Cloud Storage provider (google-cloud-storage SDK).

The google-cloud-storage library is synchronous. All I/O operations are
offloaded to a thread pool via asyncio.to_thread() to avoid blocking the
event loop.

Authentication priority (first match wins):
  1. credentials_json — inline service account JSON string
  2. credentials_file — path to a service account JSON file
  3. ADC             — Application Default Credentials (Workload Identity, gcloud auth)

Usage:
    from app.storage.gcs import GCSStorageProvider

    provider = GCSStorageProvider(
        bucket_name="fn-project-uuid",
        credentials_json='{"type": "service_account", ...}',
    )
    url = await provider.generate_presigned_upload_url(key, content_type, size_bytes)
"""
import asyncio
import json
import uuid
from datetime import timedelta

from app.errors import StorageError

try:
    from google.api_core.exceptions import Conflict as GCSConflict
    from google.api_core.exceptions import NotFound as GCSNotFound
    from google.cloud import storage as gcs
    from google.oauth2 import service_account
except ImportError as exc:
    raise ImportError(
        "google-cloud-storage is required for GCS. "
        "Run: uv add google-cloud-storage"
    ) from exc


class GCSStorageProvider:
    """
    Google Cloud Storage backend using google-cloud-storage (sync + asyncio.to_thread).

    A single `google.cloud.storage.Client` is created at construction time and
    reused across operations — the client is thread-safe.

    Args:
        bucket_name:      Target GCS bucket for all operations.
        credentials_json: Service account JSON as a string (BYOB or managed env var).
        credentials_file: Path to a service account JSON file (managed env var).
        project_id:       GCS project ID — required only when creating new buckets.
    """

    def __init__(
        self,
        *,
        bucket_name: str,
        credentials_json: str | None = None,
        credentials_file: str | None = None,
        project_id: str | None = None,
    ) -> None:
        self._bucket_name = bucket_name
        self._project_id = project_id
        self._client = self._build_client(credentials_json, credentials_file)

    def _build_client(
        self,
        credentials_json: str | None,
        credentials_file: str | None,
    ) -> "gcs.Client":
        if credentials_json:
            info = json.loads(credentials_json)
            creds = service_account.Credentials.from_service_account_info(info)
            return gcs.Client(
                credentials=creds,
                project=self._project_id or info.get("project_id"),
            )
        if credentials_file:
            creds = service_account.Credentials.from_service_account_file(credentials_file)
            return gcs.Client(credentials=creds, project=self._project_id)
        # Fall back to Application Default Credentials (Workload Identity / gcloud auth)
        return gcs.Client(project=self._project_id)

    def _bucket(self) -> "gcs.Bucket":
        return self._client.bucket(self._bucket_name)

    async def generate_presigned_upload_url(
        self,
        key: str,
        content_type: str,
        size_bytes: int,
        *,
        expires_in: int = 3600,
    ) -> str:
        """Generate a V4 signed URL for a PUT (upload) operation."""
        def _sign() -> str:
            blob = self._bucket().blob(key)
            return blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expires_in),
                method="PUT",
                content_type=content_type,
            )
        try:
            return await asyncio.to_thread(_sign)
        except Exception as exc:
            raise StorageError(f"Failed to generate upload URL for '{key}'") from exc

    async def generate_presigned_download_url(
        self,
        key: str,
        *,
        filename: str | None = None,
        expires_in: int = 3600,
    ) -> str:
        """Generate a V4 signed URL for a GET (download) operation."""
        def _sign() -> str:
            blob = self._bucket().blob(key)
            kwargs: dict = {
                "version": "v4",
                "expiration": timedelta(seconds=expires_in),
                "method": "GET",
            }
            if filename:
                kwargs["response_disposition"] = f'attachment; filename="{filename}"'
            return blob.generate_signed_url(**kwargs)
        try:
            return await asyncio.to_thread(_sign)
        except Exception as exc:
            raise StorageError(f"Failed to generate download URL for '{key}'") from exc

    async def delete_object(self, key: str) -> None:
        """Delete an object. Silently succeeds if the object does not exist."""
        def _delete() -> None:
            try:
                self._bucket().blob(key).delete()
            except GCSNotFound:
                pass

        try:
            await asyncio.to_thread(_delete)
        except StorageError:
            raise
        except Exception as exc:
            raise StorageError(f"Failed to delete '{key}'") from exc

    async def object_exists(self, key: str) -> bool:
        """Return True if the object exists."""
        def _exists() -> bool:
            return self._bucket().blob(key).exists()

        try:
            return await asyncio.to_thread(_exists)
        except Exception as exc:
            raise StorageError(f"Failed to check existence of '{key}'") from exc

    async def copy_object(self, source_key: str, dest_key: str) -> None:
        """Copy an object within the bucket."""
        def _copy() -> None:
            bucket = self._bucket()
            source_blob = bucket.blob(source_key)
            bucket.copy_blob(source_blob, bucket, dest_key)

        try:
            await asyncio.to_thread(_copy)
        except Exception as exc:
            raise StorageError(f"Failed to copy '{source_key}' → '{dest_key}'") from exc

    def _part_key(self, key: str, upload_id: str, part_number: int) -> str:
        """Storage key for a temporary part object used during multipart compose."""
        return f"{key}/_mpparts/{upload_id}/{part_number:06d}"

    async def create_multipart_upload(self, key: str, content_type: str) -> str:
        """
        Return a fresh UUID as the upload_id.

        Each part is stored as a separate GCS object at _part_key(). On complete,
        they are assembled via GCS Object Compose and the temp objects are deleted.
        """
        return str(uuid.uuid4())

    async def generate_presigned_part_url(
        self, key: str, upload_id: str, part_number: int, *, expires_in: int = 3600,
    ) -> str:
        """Generate a V4 signed PUT URL for a single part object."""
        part_key = self._part_key(key, upload_id, part_number)

        def _sign() -> str:
            blob = self._bucket().blob(part_key)
            return blob.generate_signed_url(
                version="v4",
                expiration=timedelta(seconds=expires_in),
                method="PUT",
            )

        try:
            return await asyncio.to_thread(_sign)
        except Exception as exc:
            raise StorageError(f"Failed to generate part URL for '{key}' part {part_number}") from exc

    async def complete_multipart_upload(
        self, key: str, upload_id: str, parts: list[dict],
    ) -> None:
        """
        Compose all part objects into the final object, then delete the temp parts.

        GCS compose is limited to 32 source objects per call. For more than 32 parts
        the compose is done iteratively: compose the first 31 into a temp object,
        then prepend it to the remaining parts and repeat until one final compose.
        """
        sorted_parts = sorted(parts, key=lambda x: x["PartNumber"])
        part_keys = [self._part_key(key, upload_id, p["PartNumber"]) for p in sorted_parts]
        temp_keys: list[str] = []

        def _compose(sources: list[str], dest: str) -> None:
            bucket = self._bucket()
            source_blobs = [bucket.blob(k) for k in sources]
            dest_blob = bucket.blob(dest)
            dest_blob.compose(source_blobs)

        def _delete_keys(keys: list[str]) -> None:
            bucket = self._bucket()
            for k in keys:
                try:
                    bucket.blob(k).delete()
                except GCSNotFound:
                    pass

        try:
            # Iterative compose: collapse batches of ≤31 parts into temp objects
            # until we have ≤32 sources left, then do the final compose.
            while len(part_keys) > 32:
                batch = part_keys[:31]
                temp_key = f"{key}/_mptemp/{upload_id}/{len(temp_keys):04d}"
                await asyncio.to_thread(_compose, batch, temp_key)
                temp_keys.append(temp_key)
                part_keys = [temp_key] + part_keys[31:]

            # Final compose into the real destination key
            await asyncio.to_thread(_compose, part_keys, key)

            # Cleanup all temp objects and original part objects
            all_parts = [self._part_key(key, upload_id, p["PartNumber"]) for p in sorted_parts]
            await asyncio.to_thread(_delete_keys, all_parts + temp_keys)
        except Exception as exc:
            raise StorageError(f"Failed to complete multipart upload for '{key}'") from exc

    async def abort_multipart_upload(self, key: str, upload_id: str) -> None:
        """Delete all uploaded part objects for this upload session."""
        prefix = f"{key}/_mpparts/{upload_id}/"

        def _delete_parts() -> None:
            bucket = self._bucket()
            blobs = list(self._client.list_blobs(bucket, prefix=prefix))
            for blob in blobs:
                try:
                    blob.delete()
                except GCSNotFound:
                    pass

        try:
            await asyncio.to_thread(_delete_parts)
        except Exception as exc:
            raise StorageError(f"Failed to abort multipart upload for '{key}'") from exc

    async def download_bytes(
        self,
        key: str,
        *,
        range_start: int | None = None,
        range_end: int | None = None,
    ) -> bytes:
        """Download object bytes, optionally fetching a byte range."""
        def _download() -> bytes:
            blob = self._bucket().blob(key)
            if range_start is not None or range_end is not None:
                start = range_start or 0
                end = range_end if range_end is not None else None
                return blob.download_as_bytes(start=start, end=end)
            return blob.download_as_bytes()

        try:
            return await asyncio.to_thread(_download)
        except Exception as exc:
            raise StorageError(f"Failed to download '{key}'") from exc

    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        """Upload bytes directly (used for connectivity probes and small objects)."""
        def _upload() -> None:
            self._bucket().blob(key).upload_from_string(data, content_type=content_type)

        try:
            await asyncio.to_thread(_upload)
        except Exception as exc:
            raise StorageError(f"Failed to upload '{key}'") from exc

    async def create_bucket(self, bucket_name: str) -> None:
        """
        Create a GCS bucket. Idempotent — silently succeeds if already exists.

        Args:
            bucket_name: GCS bucket name to create.

        Raises:
            StorageError: On any error other than the bucket already existing.
        """
        def _create() -> None:
            try:
                self._client.create_bucket(bucket_name, project=self._project_id)
            except GCSConflict:
                pass  # already exists

        try:
            await asyncio.to_thread(_create)
        except StorageError:
            raise
        except Exception as exc:
            raise StorageError(f"Failed to create bucket '{bucket_name}'") from exc

    async def set_bucket_cors(self, allowed_origins: list[str]) -> None:
        """No-op: GCS CORS is configured via the GCS console or gsutil separately."""
