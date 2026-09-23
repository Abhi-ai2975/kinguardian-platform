"""
table.py
====================================
Purpose:
    Provides Pydantic schema for Spark extractor configuration validation.
    Defines required and optional fields for data extraction setup.
"""
import logging
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class TableExtractorConfig(BaseModel):
    """
    Purpose:
        Validates and manages Spark extractor configuration parameters.
        Ensures proper structure for file paths and extraction options.
    """
    model_config = ConfigDict(protected_namespaces=(), extra="forbid")
    
    # Required fields
    path: str  # S3 or local file path
    
    # Optional fields with defaults
    format: Optional[str] = "csv"  # csv, parquet, json
    batch_size_mb: Optional[int] = 20
    options: Optional[Dict[str, Any]] = {}