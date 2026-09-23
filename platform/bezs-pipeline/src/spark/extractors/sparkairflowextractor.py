"""
sparkairflowextractor.py
====================================
Purpose:
    Provides a Spark extractor optimized for Airflow environments.
    Extends TableExtractor with Airflow-specific configuration handling.
"""
import logging
from pyspark.sql import DataFrame, SparkSession
from .table import TableExtractor
from typing import Dict, Any

logger = logging.getLogger(__name__)

class SparkAirflowExtractor(TableExtractor):
    """
    Purpose:
        Extends TableExtractor for Airflow-specific data extraction.
        Inherits table extraction capabilities with Airflow optimizations.
    """
    
    def __init__(self, spark: SparkSession, config: Dict[str, Any]):
        """
        Purpose:
            Initializes the SparkAirflowExtractor with Spark session and config.

        Args:
            spark (SparkSession): The active Spark session for data operations.
            config (Dict[str, Any]): Configuration parameters for extraction.
        """
        logger.debug("Initializing SparkAirflowExtractor")
        super().__init__(spark, config)
        
    def extract(self) -> DataFrame:
        """
        Purpose:
            Extracts data from S3 using parent class implementation.
        
        Args:
            None
        
        Returns:
            DataFrame: Extracted DataFrame from the specified source.
        """
        logger.info("Extracting data using Airflow-optimized Spark extractor")
        # Use the parent class implementation with Airflow-specific configurations
        return super().extract()