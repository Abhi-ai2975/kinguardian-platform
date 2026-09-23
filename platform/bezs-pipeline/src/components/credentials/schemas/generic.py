from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class GenericConnectionSchema(BaseModel):
    """
    Validates and masks sensitive data for any connection type.
    """
    # This tells Pydantic it's okay if we use names that might overlap with internal protected names.

    model_config = ConfigDict(protected_namespaces=(), extra="forbid")
    host: Optional[str] = None
    port: Optional[int] = None
    login: Optional[str] = None
    password: Optional[str] = None
    schema: Optional[str] = None  # Database name or ES Protocol
    type: Optional[str] = None    # SQLAlchemy dialect+driver
    verify_certs: Optional[bool] = None

    # Explicit Gmail/OAuth2 Fields
    refresh_token: Optional[str] = None
    token_uri: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    scopes: Optional[List[str]] = None
    universe_domain: Optional[str] = None
    account: Optional[str] = None
    expiry: Optional[str] = None

    # AWS/S3 Fields
    region_name: Optional[str] = None
    host: Optional[str] = None  # S3 endpoint
    bucket_name: Optional[str] = None
    
    # Arxiv-specific fields
    base_url: Optional[str] = None
    timeout: Optional[int] = None
    search_category: Optional[str] = None
    max_results: Optional[int] = None
    rate_limit_delay: Optional[float] = None
    download_dir: Optional[str] = None
    max_retries: Optional[int] = None
    retry_backoff: Optional[int] = None
    timeout_seconds: Optional[int] = None
