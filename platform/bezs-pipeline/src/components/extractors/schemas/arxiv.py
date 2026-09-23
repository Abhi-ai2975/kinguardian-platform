from pydantic import BaseModel
from typing import Dict

class ArxivDownloaderConfig(BaseModel):
    """
    Schema for Infrastructure settings.
    """
    
    download_dir: str
    rate_limit_delay: float
    max_retries: int
    retry_backoff: int
    timeout_seconds: int

class ArxivExtractorConfig(BaseModel):
    """
    Schema for Logic/Metadata settings.
    """

    base_url: str 
    search_category: str
    max_results: int
    rate_limit_delay: float
    namespaces: Dict[str, str]