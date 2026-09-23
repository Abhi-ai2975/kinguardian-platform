from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any

class RDBMSTableConfig(BaseModel):
    """Schema for a single table entry in RDBMS extraction configuration."""

    model_config = ConfigDict(protected_namespaces=())
    table_name: str
    schema: str
    columns: Optional[List[str]] = None
    extraction_mode: Optional[str] = "full"  # "full" or "incremental"
    cursor_column: Optional[str] = None  # Column for incremental extraction (e.g., "updated_at")
    last_extracted_value: Optional[Any] = None  # Last value for incremental extraction bookmark

class RDBMSExtractorConfig(BaseModel):
    
    # This validates that 'tables' is a list of RDBMSTableConfig objects
    tables: List[RDBMSTableConfig]

    """ The config Dict will look like this
    config_data = {
        "tables": [
            {
                "table_name": "users",
                "schema": "public",
                "columns": ["id", "name"],  # List of strings (optional)
                "extraction_mode": "full",  # "full" or "incremental" (optional, defaults to "full")
                "cursor_column": None,  # Column for incremental extraction (optional)
                "last_extracted_value": None  # Last value for incremental extraction (optional)
            },
            {
                "table_name": "orders",
                "schema": "sales",
                "columns": ["order_id", "total", "status"],
                "extraction_mode": "incremental",
                "cursor_column": "updated_at",
                "last_extracted_value": "2024-01-01 00:00:00"
            }
        ]
    } 
    
    Here, it's not dict it's an pydantic object.
    """