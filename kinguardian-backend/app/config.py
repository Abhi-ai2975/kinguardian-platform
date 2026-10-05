from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")
    environment: str = "development"
    database_url: str = "sqlite+aiosqlite:///./kinguardian.db"  # Default to SQLite for development
    iam_issuer: str = ""
    iam_audience: str = "kinguardian-api"
    iam_jwks_url: str = ""
    iam_base_url: str = ""
    event_publisher_url: str = ""
    jwt_secret_key: str = "kinguardian-secret-key-change-in-production-2026"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 120
    refresh_token_expire_days: int = 14
    ehrbase_url: str = "http://localhost:8080/ehrbase/rest/openehr/v1"
    ehrbase_auth_user: str = "ehrbase-user"
    ehrbase_auth_password: str = "SuperSecretPassword"


settings = Settings()
