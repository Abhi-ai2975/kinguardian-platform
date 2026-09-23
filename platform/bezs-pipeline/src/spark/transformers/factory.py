"""
factory.py
====================================
Purpose:
    Provides a factory for creating different types of Spark transformers.
    Supports dynamic transformer instantiation based on type specification.
"""
import logging
from .table import TableTransformer
from pyspark.sql import DataFrame

logger = logging.getLogger(__name__)

class TransformerFactory:
    """
    Purpose:
        Creates and returns appropriate Spark transformer instances.
        Handles transformer type validation and instantiation.
    """
    @staticmethod
    def create(type: str, data: DataFrame, config: dict):
        """
        Purpose:
            Creates a transformer instance based on the specified type.
        
        Args:
            type (str): The transformer type ('table').
            data (DataFrame): The Spark DataFrame containing data to transform.
            config (dict): Configuration parameters for the transformer.
        
        Returns:
            TableTransformer: The appropriate transformer instance.
        
        Raises:
            ValueError: If the transformer type is unknown.
        """
        logger.debug("Creating transformer of type: %s", type)
        if type == "table":
            return TableTransformer(data, config)
        else:
            logger.error("Unknown transformer type: %s", type)
            raise ValueError(f"Unknown transformer type: {type}")