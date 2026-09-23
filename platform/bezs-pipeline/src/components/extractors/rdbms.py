# Note: need to update the rows to generator

import logging
from sqlalchemy import text
from typing import Dict, Any, List
from .base import BaseExtractor
from .schemas.rdbms import RDBMSExtractorConfig

logger = logging.getLogger(__name__)

"""
rdbms.py
====================================
Purpose:
    Extracts tabular data from relational databases using SQLAlchemy.
"""

class RDBMSExtractor(BaseExtractor):
    """
    Extracts data from RDBMS using SQLAlchemy with full/incremental modes.
    
    Attributes:
        connection: SQLAlchemy database connection object
        config: RDBMSExtractorConfig with table extraction settings
    """
    
    def __init__(self, connection: Any, config: Dict[str, Any]):
        """
        Initialize RDBMS extractor with connection and config.
        
        Args:
            connection: SQLAlchemy database connection
            config: Configuration dict with table settings
        
        Raises:
            ValidationError: If config doesn't match RDBMSExtractorConfig schema
        """
        self.connection = connection
        self.config = RDBMSExtractorConfig(**config)

    def __call__(self):
        return self.extract()

    def extract(self):
        """
        Extract data from configured tables using memory-efficient generator.
        
        Yields:
            tuple: (table_name, row_dict) - table name and row data
        
        Raises:
            Exception: If SQL execution fails
        
        Note:
            Full mode: extracts all rows. Incremental: extracts rows where cursor_column > last_extracted_value
        """
        for table in self.config.tables:
            # Extract table configuration details
            name = table.table_name
            schema = table.schema
            cols = ", ".join(table.columns) if table.columns else "*"
            
            # Extract incremental configuration (e.g., 'incremental' vs 'full')
            mode = table.extraction_mode or 'full'
            cursor_col = table.cursor_column  # e.g., 'updated_at'
            last_val = table.last_extracted_value  # The "Bookmark"

            # Build SQL query with optional incremental filtering
            query_str = f"SELECT {cols} FROM {schema}.{name}"
            params = {}

            # Add WHERE clause for incremental extraction if configured
            if mode == "incremental" and cursor_col and last_val is not None:
                query_str += f" WHERE {cursor_col} > :last_val ORDER BY {cursor_col} ASC"
                params["last_val"] = last_val

            logger.info(f"Running {mode} extraction for table {schema}.{name}")

            try:
                # Execute the query with parameters to prevent SQL injection
                result_proxy = self.connection.execute(text(query_str), params)
                
                # Yield rows one by one as dictionaries to minimize memory usage
                for row in result_proxy.mappings():
                    yield name, dict(row)
            
            except Exception as e:
                logger.exception(f"Failed to extract data from table {schema}.{name}")
                raise e