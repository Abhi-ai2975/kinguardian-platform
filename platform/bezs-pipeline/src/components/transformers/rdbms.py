import json
import logging

logger = logging.getLogger(__name__)

class RDBMSTransformer:
    """
    Purpose:
        Transforms Python objects (dicts, lists) into CSV-friendly 
        string formats specifically for RDBMS bulk loading.
    """
    def transform(self, data, columns):
        """
        Args:
            data (list): Raw records from the pipeline.
            columns (list): Target column names.
        Returns:
            list: Cleaned records ready for the Loader.
        """
        transformed_data = []
        for record in data:
            row = []
            for col in columns:
                value = record.get(col) if isinstance(record, dict) else record
                
                # Logic moved from Loader to here
                if col == 'metadata' and isinstance(value, dict):
                    row.append(json.dumps(value))
                elif col == 'embedding' and isinstance(value, list):
                    row.append(str(value))
                else:
                    row.append(str(value) if value is not None else None)
            transformed_data.append(row)
        return transformed_data