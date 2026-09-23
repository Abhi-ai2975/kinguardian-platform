"""
factory.py
====================================
Purpose:
    Provides a factory for creating different types of Spark extractors.
    Supports dynamic extractor instantiation based on type specification.
"""
import logging
from .table import TableExtractor
from .sparkairflowextractor import SparkAirflowExtractor
from pyspark.sql import SparkSession

logger = logging.getLogger(__name__)

class ExtractorFactory:
    """
    Purpose:
        Creates and returns appropriate Spark extractor instances.
        Handles extractor type validation and instantiation.
    """
    @staticmethod
    def create(type: str, connection: SparkSession, config: dict):
        """
        Purpose:
            Creates an extractor instance based on the specified type.
        
        Args:
            type (str): The extractor type ('table' or 'sparkairflowextractor').
            connection (SparkSession): The active Spark session for data operations.
            config (dict): Configuration parameters for the extractor.
        
        Returns:
            TableExtractor or SparkAirflowExtractor: The appropriate extractor instance.
        
        Raises:
            ValueError: If the extractor type is unknown.
        """
        logger.debug("Creating extractor of type: %s", type)
        if type == "table":
            return TableExtractor(connection, config)
        elif type == "sparkairflowextractor":
            return SparkAirflowExtractor(connection, config)
        else:
            logger.error("Unknown extractor type: %s", type)
            raise ValueError(f"Unknown extractor type: {type}")