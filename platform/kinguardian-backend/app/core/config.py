"""
Application Configuration Module.
Provides strongly-typed, validated settings using Pydantic Settings.
Enforces type safety and secrets protection (never hardcoded, masked with SecretStr).
"""

from typing import Literal, Optional
from pydantic import Field, SecretStr, PositiveInt, PositiveFloat
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    KinGuardian Backend Typed Configuration.
    All environment variables are validated at startup.
    """
    PROJECT_NAME: str = Field(default="KinGuardian Platform", description="Application display name")
    APP_NAME: str = Field(default="kinguardian", description="Application system identifier")

    # ── Environment & Logging ────────────────────────────────────────────────
    ENVIRONMENT: Literal["development", "testing", "staging", "production"] = Field(
        default="development",
        description="Active application runtime environment"
    )
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO",
        description="Standardized logger severity threshold"
    )
    PORT: int = Field(default=8000, description="HTTP server listening port")

    # ── Core Database & Cache ────────────────────────────────────────────────
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://iam_user:iam_password@localhost:5432/kinguardian_db",
        description="Async SQLAlchemy database connection string"
    )

    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URI for caching and distributed locking"
    )

    # ── Database Performance & Connection Pool Tuning ────────────────────────
    DB_POOL_SIZE: PositiveInt = Field(default=20, description="SQLAlchemy connection pool base size")
    DB_MAX_OVERFLOW: int = Field(default=10, description="SQLAlchemy connection pool maximum overflow")
    DB_POOL_TIMEOUT: PositiveInt = Field(default=30, description="SQLAlchemy pool checkout timeout seconds")
    DB_POOL_RECYCLE: PositiveInt = Field(default=1800, description="SQLAlchemy pool connection recycle period seconds")
    DB_POOL_PRE_PING: bool = Field(default=True, description="Enable pre-ping connection liveness checks")
    DB_ECHO: bool = Field(default=False, description="Echo all SQL statements to stdout")
    SQL_QUERY_LOGGING: bool = Field(default=True, description="Log slow query diagnostics in development")

    # ── Identity & Access Management (IAM) ───────────────────────────────────
    IAM_ISSUER: str = Field(
        default="http://localhost:5001",
        description="Expected JWT issuer (iss) URL from bezs-iam"
    )
    IAM_JWKS_URL: str = Field(
        default="http://localhost:5001/api/auth/jwks",
        description="OIDC JWKS public key discovery URL"
    )
    IAM_AUDIENCE: str = Field(
        default="kinguardian-platform-api",
        description="Expected JWT audience (aud) claim identifier"
    )
    JWT_SECRET_KEY: SecretStr = Field(
        default=SecretStr("kinguardian-secret-key-32-bytes-minimum-length-key!"),
        description="Secret key for local HMAC token signing/verification (masked in logs)"
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="Default JWT cryptographic algorithm")
    ENCRYPTION_KEY: SecretStr = Field(
        default=SecretStr("kinguardian-phi-aes-256-gcm-master-encryption-key"),
        description="Master encryption key for sensitive PHI at rest (masked in logs)"
    )

    # ── Clinical & FHIR Services ─────────────────────────────────────────────
    FHIR_API_URL: str = Field(
        default="http://localhost:8006/api/v1",
        description="FHIR R4 REST API Gateway base URL"
    )
    FHIR_GQL_URL: str = Field(
        default="http://localhost:8005/api/v1",
        description="EMR GraphQL clinical record endpoint URL"
    )
    # Compatibility aliases for legacy gateways
    EMR_CORE_URL: str = Field(default="http://localhost:8006/api/v1", description="EMR Core service URL")
    EMR_GQL_URL: str = Field(default="http://localhost:8005/api/v1", description="EMR GraphQL service URL")

    # ── Document Storage & Compliance (FileNest WORM) ────────────────────────
    FILENEST_URL: str = Field(
        default="http://localhost:8000",
        description="FileNest WORM storage service endpoint"
    )
    FILENEST_API_KEY: SecretStr = Field(
        default=SecretStr("dev_filenest_secret_key"),
        description="FileNest authentication API key (masked in logs)"
    )
    FILENEST_PROJECT_ID: str = Field(
        default="dev_project_kinguardian",
        description="FileNest tenant project identifier"
    )

    # ── AI Agent Service & LLM Gateway ───────────────────────────────────────
    AGENT_SERVICE_URL: str = Field(
        default="http://localhost:8000",
        description="Autonomous AI Agent microservice / LLM orchestrator endpoint"
    )
    AGENT_API_URL: str = Field(
        default="http://localhost:8000",
        description="Fallback alias for agent service endpoint"
    )
    AGENT_TIMEOUT: PositiveFloat = Field(
        default=15.0,
        description="Timeout in seconds for AI Agent inference and tool execution requests"
    )

    # ── Observability & Telemetry ────────────────────────────────────────────
    OBSERVABILITY_URL: str = Field(
        default="http://localhost:4318",
        description="OpenTelemetry OTLP / Prometheus metrics collector endpoint"
    )

    # ── Notification Provider ────────────────────────────────────────────────
    NOTIFICATION_PROVIDER: Literal["in_app", "mock", "push", "email"] = Field(
        default="in_app",
        description="Active notification dispatch provider mechanism"
    )

    # ── Event Messaging & NATS JetStream ─────────────────────────────────────
    NATS_URL: str = Field(default="nats://localhost:4222", description="NATS JetStream cluster connection URI")
    NATS_STREAM_NAME: str = Field(default="KINGUARDIAN_EVENTS", description="NATS JetStream event stream name")

    EVENT_BUS_TYPE: Literal["in_memory", "nats"] = Field(
        default="in_memory",
        description="Event bus implementation engine"
    )

    # ── External Healthcare Pipelines & Open Wearables ────────────────────────
    WEARABLES_API_URL: str = Field(default="http://localhost:8000/api", description="Open Wearables API endpoint")
    OPEN_WEARABLES_URL: str = Field(
        default="http://localhost:8000",
        description="Open Wearables unified API gateway endpoint"
    )
    OPEN_WEARABLES_API_KEY: SecretStr = Field(
        default=SecretStr("dev_open_wearables_secret_key"),
        description="Open Wearables developer API key (masked in logs)"
    )
    OPEN_WEARABLES_WEBHOOK_SECRET: SecretStr = Field(
        default=SecretStr("dev_open_wearables_webhook_secret"),
        description="Secret key for verifying inbound Open Wearables webhooks"
    )
    PIPELINE_SERVICE_URL: str = Field(default="http://localhost:8000", description="Data pipeline service endpoint")


    # ── Security & Rate Limiting ─────────────────────────────────────────────
    RATE_LIMIT_ENABLED: bool = Field(default=True, description="Enable global Redis sliding window rate limiter")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def jwt_secret_key_raw(self) -> str:
        """Helper to retrieve raw string value of secret key safely."""
        return self.JWT_SECRET_KEY.get_secret_value()

    @property
    def filenest_api_key_raw(self) -> str:
        """Helper to retrieve raw string value of FileNest API key safely."""
        return self.FILENEST_API_KEY.get_secret_value()

    @property
    def encryption_key_raw(self) -> str:
        """Helper to retrieve raw string value of encryption key safely."""
        return self.ENCRYPTION_KEY.get_secret_value()


settings = Settings()
