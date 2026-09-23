"""
app.storage.resolver — StorageResolver: maps a StorageConfig record to its provider.

build_provider() is the primary API. It reads a StorageConfig ORM record and
dispatches to the correct StorageProvider implementation — using platform env-var
credentials for managed mode, or decrypted DB credentials for BYOB mode.

Provider routing:
  s3        →  S3StorageProvider   (env: S3_*)
  minio     →  S3StorageProvider   (env: MINIO_*)
  rustfs    →  S3StorageProvider   (env: RUSTFS_*)
  r2        →  S3StorageProvider   (env: R2_*)
  azure_blob →  AzureBlobStorageProvider  (env: AZURE_*)
  gcs        →  GCSStorageProvider        (env: GCS_*)

Usage:
    from app.storage.resolver import storage_resolver

    # Dynamic dispatch from a StorageConfig ORM record:
    provider = storage_resolver.build_provider(storage_config)

    # Managed provider for direct use (e.g. project creation probe):
    provider = storage_resolver.build_managed_provider("s3", "fn-project-uuid")

    # Provision the platform-managed bucket for a new project:
    bucket_name = await storage_resolver.provision_managed_bucket(project_id, "s3")

    # Phase 1 static fallback (FileService — no StorageConfig available yet):
    provider = await storage_resolver.get_provider(project_id)
"""
from app.core.config import settings
from app.errors import StorageError
from app.storage.provider import StorageProvider
from app.storage.s3 import S3StorageProvider

_SUPPORTED_PROVIDERS = ["s3", "minio", "rustfs", "r2", "azure_blob", "gcs"]


class StorageResolver:
    """
    Factory that resolves the correct StorageProvider for a project.

    All builder methods return new provider instances — there is no caching,
    so each call is safe to use with different credentials or bucket names.
    """

    async def provision_managed_bucket(
        self, project_id: str, provider: str | None = None
    ) -> str:
        """
        Create the platform-managed bucket for a new project and return its name.

        Bucket name format: fn-{project_id} — globally unique because project IDs
        are UUIDs. The create call is idempotent so retries are safe.

        Args:
            project_id: The project's UUID string.
            provider:   Provider type string (e.g. "s3", "azure_blob"). Defaults
                        to settings.default_storage_provider.

        Returns:
            The bucket name (store in storage_configs.bucket_name).

        Raises:
            StorageError: If the provider cannot create the bucket.
        """
        bucket_name = f"fn-{project_id}"
        p = (provider or settings.default_storage_provider).lower()
        managed = self._build_managed_provider(p, bucket_name)
        await managed.create_bucket(bucket_name)
        # Apply permissive CORS immediately so browsers can PUT presigned URLs.
        # When the project later configures allowed_origins, update_security_config
        # syncs the specific origins to the bucket.
        await managed.set_bucket_cors(["*"])
        return bucket_name

    def build_provider(self, storage_config) -> StorageProvider:
        """
        Return the correct StorageProvider for a StorageConfig ORM record.

        Reads storage_mode, provider, bucket_name, and (for byob) config_encrypted
        to construct the right implementation with the right credentials.

        Args:
            storage_config: A StorageConfig ORM model instance.

        Raises:
            StorageError: If the provider type is unsupported or credentials are invalid.
        """
        if storage_config.storage_mode == "managed":
            bucket = storage_config.bucket_name or f"fn-{storage_config.project_id}"
            return self._build_managed_provider(
                storage_config.provider, bucket, sse_enabled=storage_config.sse_enabled
            )
        return self._build_byob_provider(storage_config)

    def build_managed_provider(self, provider: str, bucket_name: str) -> StorageProvider:
        """
        Build a managed provider directly without a StorageConfig record.

        Used during project creation to probe a freshly provisioned bucket before
        the storage_configs row has been written.

        Args:
            provider:    Provider type string (e.g. "s3", "azure_blob", "gcs").
            bucket_name: Target bucket / container name.
        """
        return self._build_managed_provider(provider, bucket_name)

    async def get_provider(
        self, project_id: str, *, environment: str = "live"
    ) -> StorageProvider:
        """
        Phase 1 static fallback: returns the platform-managed default provider.

        FileService calls this because it does not yet load a StorageConfig record.
        In Phase 7 this method will look up the StorageConfig and call build_provider().

        Args:
            project_id:  Project UUID (unused in Phase 1).
            environment: "live" or "test" (unused in Phase 1).
        """
        p = settings.default_storage_provider.lower()
        default_buckets = {
            "s3": settings.s3_bucket_name,
            "minio": settings.minio_bucket_name,
            "rustfs": settings.rustfs_bucket_name,
            "r2": settings.r2_bucket_name,
        }
        bucket = default_buckets.get(p, "filenest")
        return self._build_managed_provider(p, bucket)

    # ── Private builders ──────────────────────────────────────────────────────

    def _build_managed_provider(
        self, provider: str, bucket_name: str, sse_enabled: bool = False
    ) -> StorageProvider:
        """Build a provider using platform credentials from env vars."""
        p = provider.lower()
        if p == "s3":
            return S3StorageProvider(
                endpoint_url=None,  # AWS SDK resolves the endpoint automatically
                access_key_id=settings.s3_access_key_id,
                secret_access_key=settings.s3_secret_access_key,
                bucket_name=bucket_name,
                region=settings.s3_region,
                force_path_style=False,
                sse_enabled=sse_enabled,
            )
        if p == "minio":
            return S3StorageProvider(
                endpoint_url=settings.minio_endpoint_url,
                access_key_id=settings.minio_access_key_id,
                secret_access_key=settings.minio_secret_access_key,
                bucket_name=bucket_name,
                region=settings.minio_region,
                force_path_style=True,
                sse_enabled=sse_enabled,
            )
        if p == "rustfs":
            return S3StorageProvider(
                endpoint_url=settings.rustfs_endpoint_url,
                access_key_id=settings.rustfs_access_key_id,
                secret_access_key=settings.rustfs_secret_access_key,
                bucket_name=bucket_name,
                region=settings.rustfs_region,
                force_path_style=True,
                sse_enabled=sse_enabled,
            )
        if p == "r2":
            return S3StorageProvider(
                endpoint_url=settings.r2_endpoint_url,
                access_key_id=settings.r2_access_key_id,
                secret_access_key=settings.r2_secret_access_key,
                bucket_name=bucket_name,
                region=settings.r2_region,
                force_path_style=True,
                sse_enabled=sse_enabled,
            )
        if p == "azure_blob":
            from app.storage.azure import AzureBlobStorageProvider

            if not settings.azure_account_name or not settings.azure_account_key:
                raise StorageError(
                    "AZURE_ACCOUNT_NAME and AZURE_ACCOUNT_KEY must be set for managed Azure storage",
                    detail={"provider": "azure_blob"},
                )
            return AzureBlobStorageProvider(
                account_name=settings.azure_account_name,
                account_key=settings.azure_account_key,
                container_name=bucket_name,
            )
        if p == "gcs":
            from app.storage.gcs import GCSStorageProvider

            return GCSStorageProvider(
                credentials_json=settings.gcs_credentials_json,
                credentials_file=settings.gcs_credentials_file,
                bucket_name=bucket_name,
                project_id=settings.gcs_project_id,
            )
        raise StorageError(
            f"Unsupported storage provider: '{provider}'",
            detail={"configured": provider, "supported": _SUPPORTED_PROVIDERS},
        )

    def _build_byob_provider(self, storage_config) -> StorageProvider:
        """Build a provider from decrypted BYOB credentials stored in the DB."""
        from app.core.crypto import decrypt_storage_credentials

        if not storage_config.config_encrypted:
            raise StorageError(
                "BYOB storage config has no credentials — call update_config first",
                detail={"project_id": storage_config.project_id},
            )

        creds = decrypt_storage_credentials(storage_config.config_encrypted)
        p = storage_config.provider.lower()

        if p in ("s3", "minio", "rustfs", "r2"):
            return S3StorageProvider(
                endpoint_url=storage_config.endpoint_url,
                access_key_id=creds.get("access_key_id"),
                secret_access_key=creds.get("secret_access_key"),
                bucket_name=storage_config.bucket_name,
                region=storage_config.region or "us-east-1",
                # Non-AWS S3-compatible providers require path-style addressing
                force_path_style=p != "s3",
                sse_enabled=storage_config.sse_enabled,
                server_side_encryption=storage_config.server_side_encryption,
                kms_key_id=storage_config.kms_key_id,
            )
        if p == "azure_blob":
            from app.storage.azure import AzureBlobStorageProvider

            return AzureBlobStorageProvider(
                account_name=creds["account_name"],
                account_key=creds["account_key"],
                container_name=storage_config.bucket_name,
            )
        if p == "gcs":
            from app.storage.gcs import GCSStorageProvider

            return GCSStorageProvider(
                credentials_json=creds.get("credentials_json"),
                bucket_name=storage_config.bucket_name,
            )
        raise StorageError(
            f"Unsupported storage provider: '{storage_config.provider}'",
            detail={"configured": storage_config.provider, "supported": _SUPPORTED_PROVIDERS},
        )


# Module-level singleton — all methods are stateless and safe for concurrent async use.
storage_resolver = StorageResolver()
