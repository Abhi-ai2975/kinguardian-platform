from pydantic import BaseModel, Field
from typing import Optional, List, Literal

class ElasticsearchExtractorConfig(BaseModel):
    """
    Configuration schema for extracting data from Elasticsearch.
    
    Supports:
    - bulk extraction (full index scan)
    - incremental extraction (based on a timestamp / monotonic field)
    """
    
    #Target index
    index_name: str
    
    #extraction mode
    extraction_mode: Literal["bulk", "incremental"] = "bulk"
    
    # Pagination
    batch_size: int = Field(default=500, gt=0)
    
    # Incremental extraction settings
    incremental_field: Optional[str] = None
    sort_field: Optional[str]
    
    #Optional field selection
    fields: Optional[List[str]] = None
    
    #checkpointing (extrenal system , e.g. Airflow variable key)
    checkpoint_key: Optional[str] = None
    
    class Config:
        extra = "forbid"