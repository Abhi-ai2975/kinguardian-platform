"""
table.py
====================================
Purpose:
    Provides universal data transformation for Spark DataFrames.
    Handles column normalization, text concatenation, and metadata structuring.
"""
import logging

from pyspark.sql import DataFrame
from pyspark.sql.functions import col, lower, trim, concat_ws, struct
from .schemas.table import TableTransformerConfig

logger = logging.getLogger(__name__)

class TableTransformer:
    """
    Purpose:
        Manages data transformation for tabular Spark DataFrames.
        Handles column normalization and universal text field creation.
    """
    def __init__(self, data: DataFrame, config: dict):
        """
        Purpose:
            Initializes the TableTransformer with DataFrame and configuration.
        
        Args:
            data (DataFrame): The Spark DataFrame containing data to transform.
            config (dict): Configuration parameters including id_column and normalize_columns.
        """
        self.config = TableTransformerConfig(**config)
        self.data = data
        logger.debug("TableTransformer initialized with %d columns", len(data.columns))

    def __call__(self):
        """
        Purpose:
            Enables the transformer to be called directly.
        
        Args:
            None
        
        Returns:
            DataFrame: The transformed DataFrame.
        """
        return self.transform()

    def transform(self, data: DataFrame = None, config: dict = None) -> DataFrame:
        """
        Purpose:
            Transforms DataFrame by normalizing columns and creating universal text field.
        
        Args:
            data (DataFrame): Optional DataFrame to transform (uses self.data if None).
            config (dict): Optional configuration (uses self.config if None).
        
        Returns:
            DataFrame: Transformed DataFrame with id, text, and metadata columns.
        """
        df = data if data is not None else self.data
        cfg = config if config is not None else self.config
        
        logger.info("Starting table transformation on DataFrame with %d columns", len(df.columns))
    
        # 1. Dynamic Drop (last column)
        df = df.drop(df.columns[-1])
        logger.info(f"Dropped last column: {df}")

        # 2. Preparation
        target_columns = set(cfg.normalize_columns or [])
        id_col_name = cfg.id_column or df.columns[0]
        logger.info(f"Target columns for normalization: {target_columns}")
        logger.info(f"Using column '{id_col_name}' as ID")
    
        # 3. Single-Pass Transformation Logic
        select_columns = []
        for c in df.columns:
            if c in target_columns:
                select_columns.append(lower(trim(col(c))).alias(c))
                logger.info(f"Normalizing column: {c}")
            else:
                select_columns.append(col(c))
        
        # applies all transformations in a single operation
        df_normalized = df.select(*select_columns)
        logger.info(f"Applied normalization to {len(target_columns)} columns")

        # 4. Final Projection
        # Note: Excluding id/text from metadata to save space
        metadata_cols = [c for c in df_normalized.columns if c not in [id_col_name]]
        
        # Create a universal text field by concatenating ALL columns values
        # This makes the pipeline work with any dataset
        text_col = concat_ws(" ", *[col(c).cast("string") for c in metadata_cols])
        
        # Debug: Log available columns
        logger.info(f"Available columns after transformation: {df_normalized.columns}")
        logger.info(f"Creating universal text field from all columns")
        
        result = df_normalized.select(
            col(id_col_name).alias("id"),
            text_col.alias("text"),
            struct(*metadata_cols).alias("metadata")
        )
        
        logger.info("Table transformation completed successfully")
        return result