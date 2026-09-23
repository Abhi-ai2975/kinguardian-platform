"""
app.storage.s3 — S3-compatible storage provider (aioboto3).

Works with any S3-compatible backend by setting S3_ENDPOINT_URL:

  RustFS / MinIO (local):  http://localhost:9000 + force_path_style=True
  AWS S3:                  (empty, boto3 default) + force_path_style=False
  Cloudflare R2:           https://<account>.r2.cloudflarestorage.com + force_path_style=True

Usage:
    from app.storage.s3 import S3StorageProvider
"""
import aioboto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.errors import StorageError


class S3StorageProvider:
    """
    S3-compatible storage provider backed by aioboto3.

    Args:
        endpoint_url:           Override the S3 endpoint. None → AWS S3 default.
        access_key_id:          AWS/provider access key ID.
        secret_access_key:      AWS/provider secret access key.
        bucket_name:            Target bucket for all operations.
        region:                 AWS region.
        force_path_style:       True for RustFS, MinIO, and Cloudflare R2.
        sse_enabled:            Send server-side encryption headers on put/upload.
        server_side_encryption: "AES256" (default) or "aws:kms".
        kms_key_id:             KMS key ARN — used only when server_side_encryption="aws:kms".
    """

    def __init__(
        self,
        *,
        endpoint_url: str | None,
        access_key_id: str | None,
        secret_access_key: str | None,
        bucket_name: str,
        region: str,
        force_path_style: bool,
        sse_enabled: bool = False,
        server_side_encryption: str | None = None,
        kms_key_id: str | None = None,
    ) -> None:
        self._endpoint_url = endpoint_url
        self._access_key_id = access_key_id
        self._secret_access_key = secret_access_key
        self._bucket_name = bucket_name
        self._region = region
        self._force_path_style = force_path_style
        self._sse_enabled = sse_enabled
        self._server_side_encryption = server_side_encryption or "AES256"
        self._kms_key_id = kms_key_id
        self._session = aioboto3.Session()

    def _sse_params(self) -> dict:
        """Return SSE parameters to add to put_object or presigned URL Params."""
        if not self._sse_enabled:
            return {}
        if self._server_side_encryption == "aws:kms":
            params: dict = {"ServerSideEncryption": "aws:kms"}
            if self._kms_key_id:
                params["SSEKMSKeyId"] = self._kms_key_id
            return params
        return {"ServerSideEncryption": "AES256"}

    def _client_kwargs(self) -> dict:
        kwargs: dict = {"region_name": self._region}
        if self._endpoint_url:
            kwargs["endpoint_url"] = self._endpoint_url
        if self._access_key_id:
            kwargs["aws_access_key_id"] = self._access_key_id
        if self._secret_access_key:
            kwargs["aws_secret_access_key"] = self._secret_access_key
        addressing = "path" if self._force_path_style else "auto"
        kwargs["config"] = Config(
            signature_version="s3v4",
            s3={"addressing_style": addressing},
        )
        return kwargs

    async def generate_presigned_upload_url(
        self, key: str, content_type: str, size_bytes: int, *, expires_in: int = 3600,
    ) -> str:
        """Generate a presigned PUT URL for direct client-to-storage uploads."""
        try:
            params: dict = {"Bucket": self._bucket_name, "Key": key, "ContentType": content_type}
            params.update(self._sse_params())
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                url: str = await s3.generate_presigned_url(
                    "put_object",
                    Params=params,
                    ExpiresIn=expires_in,
                )
            return url
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to generate upload URL for '{key}'", detail={"error": str(exc)}) from exc

    async def generate_presigned_download_url(
        self, key: str, *, filename: str | None = None, expires_in: int = 3600,
    ) -> str:
        """Generate a presigned GET URL for downloading an object."""
        params: dict = {"Bucket": self._bucket_name, "Key": key}
        if filename:
            params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
        try:
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                url: str = await s3.generate_presigned_url("get_object", Params=params, ExpiresIn=expires_in)
            return url
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to generate download URL for '{key}'", detail={"error": str(exc)}) from exc

    async def delete_object(self, key: str) -> None:
        """Delete an object. Silently succeeds if the object does not exist."""
        try:
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                await s3.delete_object(Bucket=self._bucket_name, Key=key)
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to delete '{key}'", detail={"error": str(exc)}) from exc

    async def object_exists(self, key: str) -> bool:
        """Return True if the object exists (uses head_object)."""
        try:
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                await s3.head_object(Bucket=self._bucket_name, Key=key)
            return True
        except ClientError as exc:
            if exc.response["Error"]["Code"] in ("404", "NoSuchKey"):
                return False
            raise StorageError(f"Unexpected error checking '{key}'", detail={"error": str(exc)}) from exc
        except BotoCoreError as exc:
            raise StorageError(f"Failed to check existence of '{key}'", detail={"error": str(exc)}) from exc

    async def create_multipart_upload(self, key: str, content_type: str) -> str:
        """Initiate an S3 multipart upload and return the provider upload_id."""
        try:
            kwargs: dict = {
                "Bucket": self._bucket_name,
                "Key": key,
                "ContentType": content_type,
            }
            kwargs.update(self._sse_params())
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                response = await s3.create_multipart_upload(**kwargs)
                return response["UploadId"]
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to create multipart upload for '{key}'", detail={"error": str(exc)}) from exc

    async def generate_presigned_part_url(
        self, key: str, upload_id: str, part_number: int, *, expires_in: int = 3600,
    ) -> str:
        """Generate a presigned PUT URL for a single multipart upload part."""
        try:
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                url: str = await s3.generate_presigned_url(
                    "upload_part",
                    Params={
                        "Bucket": self._bucket_name,
                        "Key": key,
                        "UploadId": upload_id,
                        "PartNumber": part_number,
                    },
                    ExpiresIn=expires_in,
                )
            return url
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to generate part URL for '{key}' part {part_number}", detail={"error": str(exc)}) from exc

    async def complete_multipart_upload(
        self, key: str, upload_id: str, parts: list[dict],
    ) -> None:
        """
        Assemble all uploaded parts into the final object.

        Args:
            parts: List of {"PartNumber": int, "ETag": str} dicts from the client.
        """
        try:
            multipart_parts = [
                {"PartNumber": p["PartNumber"], "ETag": p["ETag"]}
                for p in sorted(parts, key=lambda x: x["PartNumber"])
            ]
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                await s3.complete_multipart_upload(
                    Bucket=self._bucket_name,
                    Key=key,
                    UploadId=upload_id,
                    MultipartUpload={"Parts": multipart_parts},
                )
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to complete multipart upload for '{key}'", detail={"error": str(exc)}) from exc

    async def abort_multipart_upload(self, key: str, upload_id: str) -> None:
        """Abort an in-progress multipart upload and discard all uploaded parts."""
        try:
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                await s3.abort_multipart_upload(
                    Bucket=self._bucket_name, Key=key, UploadId=upload_id,
                )
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to abort multipart upload for '{key}'", detail={"error": str(exc)}) from exc

    async def download_bytes(
        self, key: str, *, range_start: int | None = None, range_end: int | None = None,
    ) -> bytes:
        """Download object bytes, optionally fetching a sub-range (e.g. for MIME sniffing)."""
        try:
            kwargs: dict = {"Bucket": self._bucket_name, "Key": key}
            if range_start is not None or range_end is not None:
                start = range_start or 0
                end_str = str(range_end) if range_end is not None else ""
                kwargs["Range"] = f"bytes={start}-{end_str}"
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                response = await s3.get_object(**kwargs)
                return await response["Body"].read()
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to download '{key}'", detail={"error": str(exc)}) from exc

    async def upload(self, key: str, data: bytes, content_type: str) -> None:
        """Upload bytes directly to the bucket (used for connectivity probes)."""
        try:
            kwargs: dict = {
                "Bucket": self._bucket_name,
                "Key": key,
                "Body": data,
                "ContentType": content_type,
            }
            kwargs.update(self._sse_params())
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                await s3.put_object(**kwargs)
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to upload '{key}'", detail={"error": str(exc)}) from exc

    async def create_bucket(self, bucket_name: str) -> None:
        """
        Create a new bucket in the same S3-compatible service.

        Idempotent — silently succeeds if the bucket already exists and is
        owned by the same account. Raises StorageError for all other errors.

        Note: AWS S3 us-east-1 must not include a LocationConstraint in the
        create request; all other regions and S3-compatible services (RustFS,
        MinIO, R2) accept it unconditionally.
        """
        try:
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                kwargs: dict = {"Bucket": bucket_name}
                if self._region and self._region != "us-east-1":
                    kwargs["CreateBucketConfiguration"] = {"LocationConstraint": self._region}
                await s3.create_bucket(**kwargs)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if code in ("BucketAlreadyOwnedByYou", "BucketAlreadyExists"):
                return  # idempotent
            raise StorageError(f"Failed to create bucket '{bucket_name}'") from exc
        except BotoCoreError as exc:
            raise StorageError(f"Failed to create bucket '{bucket_name}'") from exc

    async def set_bucket_cors(self, allowed_origins: list[str]) -> None:
        """
        Apply a CORS policy to the bucket so browsers can PUT presigned URLs directly.

        Must include:
          - AllowedMethods: PUT (for presigned uploads), HEAD (for preflight)
          - ExposeHeaders: ETag (required for multipart part tracking)

        Call this at startup for every managed bucket. Idempotent — re-applying
        the same policy overwrites it without error.

        Args:
            allowed_origins: List of origins to allow (e.g. ["http://localhost:3000"]).
        """
        try:
            cors_config = {
                "CORSRules": [
                    {
                        "AllowedOrigins": allowed_origins,
                        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
                        "AllowedHeaders": ["*"],
                        "ExposeHeaders": ["ETag", "x-amz-request-id"],
                        "MaxAgeSeconds": 3600,
                    }
                ]
            }
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                await s3.put_bucket_cors(
                    Bucket=self._bucket_name,
                    CORSConfiguration=cors_config,
                )
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(
                f"Failed to set CORS on bucket '{self._bucket_name}'",
                detail={"error": str(exc)},
            ) from exc

    async def copy_object(self, source_key: str, dest_key: str) -> None:
        """Copy an object within the bucket (versioning, Phase 3)."""
        try:
            async with self._session.client("s3", **self._client_kwargs()) as s3:
                await s3.copy_object(
                    Bucket=self._bucket_name,
                    CopySource={"Bucket": self._bucket_name, "Key": source_key},
                    Key=dest_key,
                )
        except (BotoCoreError, ClientError) as exc:
            raise StorageError(f"Failed to copy '{source_key}' → '{dest_key}'", detail={"error": str(exc)}) from exc
