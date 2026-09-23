import logging
from datetime import datetime, date
from decimal import Decimal
from typing import Dict, Any, Union

logger = logging.getLogger(__name__)

"""
base.py
====================================
Purpose:
    Provides a foundation for all transformer classes. It contains 
    the shared logic for data type cleaning and Elasticsearch-style formatting.
"""

class BaseTransformer:
    """
    Purpose:
        Acts as the parent class for all transformers to ensure 
        output consistency across the pipeline.
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Purpose: Initializes the transformer with shared configuration.

        Args:
            config (Dict[str, Any]): Configuration containing 'index_name'.
        """
        self.config = config
        self.index_name = config.get("index_name")
        logger.debug(f"BaseTransformer initialized for index: {self.index_name}")

    def transform(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Purpose: Converts a raw dictionary into a standardized, index-ready format.
        It cleans data types and wraps the result in an '_index' and '_source' structure.
        
        Args:
            data (Dict[str, Any]): The raw dictionary to be cleaned.
            
        Returns:
            Dict[str, Any]: A dictionary formatted for the indexing script.
        """
        clean_row = {}
        
        for key, value in data.items():
            # Standardizing Data Types for JSON serialization
            if isinstance(value, (datetime, date)):
                clean_row[key] = value.isoformat()
            elif isinstance(value, Decimal):
                clean_row[key] = float(value)
            # Handle non-standard types by stringifying
            elif value is not None and not isinstance(value, (str, int, float, bool, list, dict)):
                clean_row[key] = str(value)
            else:
                clean_row[key] = value

        return {
            "_index": self.index_name,
            "_source": clean_row
        }