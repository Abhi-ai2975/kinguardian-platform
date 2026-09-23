"""
table.py
====================================
Purpose:
    Provides Pydantic schema for Spark transformer configuration validation.
    Defines required and optional fields for data transformation setup.
"""
import logging
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

logger = logging.getLogger(__name__)

class TableTransformerConfig(BaseModel):
    """
    Purpose:
        Validates and manages Spark transformer configuration parameters.
        Ensures proper structure for column transformation settings.
    """
    model_config = ConfigDict(protected_namespaces=(), extra="forbid")
    
    # Column configuration
    id_column: Optional[str] = None  # Use first column if not specified
    normalize_columns: Optional[List[str]] = []  # Columns to normalize (lowercase, trim)
    
    """ Example configuration:
    config_data = {
        "id_column": "Row ID",
        "normalize_columns": ["Customer Name", "Product Name"]
    }
    """