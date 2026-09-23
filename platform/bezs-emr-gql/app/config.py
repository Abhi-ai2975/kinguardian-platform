"""
Central application configuration loaded from environment variables and the .env file.
All runtime settings live here so nothing is scattered across modules as magic strings.
Pydantic-settings handles casting, validation, and .env parsing automatically.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application-wide settings resolved from environment variables at startup.
    Pydantic-settings reads from the process environment first, then falls back
    to the .env file, then to the defaults defined below.
    Any value here can be overridden at deploy time by setting the corresponding
    environment variable (e.g. FHIR_SERVER_URL=https://prod-fhir.example.com).
    """

    # Base URL of the downstream FHIR Server that owns persistence.
    # All FHIR resource operations proxy through this URL.
    FHIR_SERVER_URL: str = "http://localhost:8001/api/fhir/v1"

    # Base URL for the terminology service on the FHIR Server.
    # Terminology is mounted outside the FHIR namespace (/api/v1/terminology, not
    # /api/fhir/v1/...) so it needs its own base URL separate from FHIR_SERVER_URL.
    TERMINOLOGY_SERVER_URL: str = "http://localhost:8001/api/v1/terminology"

    # BetterAuth / IAM — JWT validation endpoints.
    # IAM_JWKS_URL: the JSON Web Key Set endpoint used to fetch the public key
    #               for verifying incoming JWT signatures without storing secrets here.
    # IAM_ISSUER:   the expected `iss` claim in every JWT; also used as the audience
    #               value because BetterAuth sets aud == iss by convention.
    IAM_JWKS_URL: str = "http://localhost:5000/api/auth/jwks"
    IAM_ISSUER: str = "http://localhost:5000"

    # Controls logging verbosity and behaviour in exception handlers.
    # Accepted values: "development" | "staging" | "production"
    ENVIRONMENT: str = "development"

    # Redis connection URL used by RateLimitMiddleware.
    # Format: redis://[user:password@]host[:port]/db_number
    REDIS_URL: str = "redis://localhost:6379/0"

    # Rate limit thresholds per unique client identity per RATE_LIMIT_WINDOW seconds.
    # Read operations (GET/HEAD) are given a higher allowance than write operations
    # because reads are expected to be significantly more frequent in a clinical UI.
    RATE_LIMIT_READ: int = 100   # GET/HEAD requests allowed per window per client
    RATE_LIMIT_WRITE: int = 20   # POST/PATCH/DELETE requests allowed per window per client
    RATE_LIMIT_WINDOW: int = 60  # sliding window duration in seconds

    # Tell pydantic-settings to load missing values from .env in UTF-8 encoding.
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


# Module-level singleton — import `settings` everywhere instead of instantiating
# Settings() multiple times to avoid re-reading the environment on each import.
settings = Settings()
