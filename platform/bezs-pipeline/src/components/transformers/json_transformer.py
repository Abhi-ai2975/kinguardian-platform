# Note: need to modify the model_name finding (.rstrip('s'))
import logging
from typing import Dict, Any, Iterator, List
from .base import BaseTransformer
from . import schemas 

logger = logging.getLogger(__name__)

"""
json_transformer.py
====================================
Purpose:
    Specialized transformer for structured data (like RDBMS results). 
    Standardizes records for bulk indexing.
"""

class JsonTransformer(BaseTransformer):
    """
    Purpose: 
        Processes structured multi-table data into a format suitable 
        for bulk indexing using shared base logic.
    """

    def __init__(self, data: Dict[str, List[Dict[str, Any]]], config: Dict[str, Any]):
        """
        Purpose: Initializes the transformer with the dataset and configuration.

        Args:
            data (Dict[str, List[Dict[str, Any]]]): Raw data organized by table names.
            config (Dict[str, Any]): Configuration containing 'index_name'.
        """
        super().__init__(config)
        self.data = data
        # We import the schema module to look up models by name dynamically
        self.schema_module = schemas

    def __call__(self) -> Iterator[Dict[str, Any]]:
        # 1. Safety Check
        if not self.data:
            logger.warning("JsonTransformer received empty data.")
            return

        # 2. Table Loop: The input 'self.data' is a dict where keys are table names
        # Example: table_name = "users", rows = [{row1}, {row2}]
        for table_name, rows in self.data.items():
        
            # 3. Dynamic Naming: Converts "users" -> "UserRecord"
            # .capitalize() makes "users" -> "Users"
            # .rstrip('s') makes "Users" -> "User"
            model_name = f"{table_name.capitalize().rstrip('s')}Record"
            
            # 4. Lookup: Searches schemas.py for a class named "UserRecord"
            model_class = getattr(self.schema_module, model_name, None)
            
            # 5. Row Loop: Process every record inside the table
            for row in rows:
                try:
                    # 6. Strict Validation:
                    # This line checks if the row has the right columns and types.
                    # If "UserRecord" was found, it validates the row.
                    if model_class:
                        validated_data = model_class(**row).model_dump()
                    else:
                        # If no schema is found, we just use the raw row
                        validated_data = row
                    
                    # 7. Formatting:
                    # Calls 'transform' from base.py to turn Decimals into floats,
                    # Dates into strings, and adds the "_index" wrapper.
                    yield self.transform(validated_data)
                    
                except Exception as e:
                    # 8. Error Handling: 
                    # If a row is "dirty" (missing columns), it logs and skips to the next row.
                    logger.error(f"Validation failed for {table_name}: {e}")
                    continue