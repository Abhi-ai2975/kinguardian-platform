"""
app.core.config — Application-wide configuration via Pydantic Settings.

All runtime settings are read from environment variables and an optional .env
file. Import the `settings` singleton everywhere; never instantiate Settings
more than once.

Usage:
    from app.core.config import settings

    url = settings.database_primary_url
"""
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Single configuration object for the entire FileNest backend."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── Runtime ───────────────────────────────────────────────────────────────
    env: str = "development"
    service_name: str = "filenest"

    # ── Database ──────────────────────────────────────────────────────────────
    database_primary_url: str = Field(..., alias="DATABASE_PRIMARY_URL")
    database_replica_url: str | None = Field(None, alias="DATABASE_REPLICA_URL")
    database_pool_size: int = 20
    database_max_overflow: int = 10

    # ── Redis ─────────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── NATS ──────────────────────────────────────────────────────────────────
    nats_url: str = "nats://localhost:4222"
    nats_stream_name: str = "FILENEST_EVENTS"

    # ── IAM ───────────────────────────────────────────────────────────────────
    # URL of the BetterAuth IAM. Used to verify fn_ API keys and JWKS endpoint.
    iam_url: str = Field("http://localhost:3000", alias="IAM_URL")
    # Shared secret for the internal /api/internal/* endpoints.
    # Must match INTERNAL_API_SECRET in the IAM .env.
    internal_api_secret: str | None = Field(None, alias="INTERNAL_API_SECRET")

    # ── Storage ───────────────────────────────────────────────────────────────
    default_storage_provider: str = "s3"
    storage_encryption_key: str | None = None

    # AWS S3 — standard SDK endpoint (no custom URL needed)
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None
    s3_bucket_name: str = "filenest"
    s3_region: str = "us-east-1"

    # MinIO — self-hosted S3-compatible object storage
    minio_endpoint_url: str = "http://localhost:9000"
    minio_access_key_id: str | None = None
    minio_secret_access_key: str | None = None
    minio_bucket_name: str = "filenest"
    minio_region: str = "us-east-1"
    # KMS key configured on the MinIO server process (MINIO_KMS_SECRET_KEY env on the server).
    # FileNest sends ServerSideEncryption: AES256; the MinIO server uses this key to encrypt.
    minio_kms_secret_key: str | None = None

    # RustFS — Rust-native S3-compatible object storage
    rustfs_endpoint_url: str = "http://localhost:9000"
    rustfs_access_key_id: str | None = None
    rustfs_secret_access_key: str | None = None
    rustfs_bucket_name: str = "filenest"
    rustfs_region: str = "us-east-1"
    # KMS key configured on the RustFS server process.
    rustfs_kms_secret_key: str | None = None

    # Cloudflare R2 — S3-compatible, endpoint format: https://<account>.r2.cloudflarestorage.com
    r2_endpoint_url: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_bucket_name: str = "filenest"
    r2_region: str = "auto"

    # Azure Blob Storage (managed mode — platform credentials)
    azure_account_name: str | None = None
    azure_account_key: str | None = None

    # Google Cloud Storage (managed mode — platform credentials)
    # Provide exactly one of: credentials JSON string, path to a service account file, or use ADC.
    gcs_project_id: str | None = None
    gcs_credentials_json: str | None = None
    gcs_credentials_file: str | None = None

    # ── Security ──────────────────────────────────────────────────────────────
    # Used only for HS256 local JWT testing. Production uses JWKS from IAM.
    jwt_secret_key: str = "dev-secret"

    # ── Upload ────────────────────────────────────────────────────────────────
    multipart_threshold_bytes: int = 104857600  # 100 MB

    # ── ClamAV ───────────────────────────────────────────────────────────────
    clamav_host: str = "clamav"
    clamav_port: int = 3310
    # How long to wait for clamd to respond, in seconds. ClamAV takes 1-3 min
    # on startup to load virus definitions; this timeout prevents the pipeline
    # from hanging indefinitely if clamd is slow or crashes mid-load.
    clamav_timeout: int = 300

    # ── Feature flags ─────────────────────────────────────────────────────────
    healthcare_pack_enabled: bool = False

    # ── Observability ─────────────────────────────────────────────────────────
    otel_endpoint: str | None = None

    @property
    def is_dev(self) -> bool:
        """True when running in the local development environment."""
        return self.env == "development"

    @property
    def iam_jwks_url(self) -> str:
        """JWKS endpoint on the IAM for RS256 JWT verification."""
        return f"{self.iam_url}/api/auth/jwks"


settings = Settings()
