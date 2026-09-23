"""
factory.py
====================================
Purpose:
    Provides a factory for creating different types of Spark embedders.
    Supports dynamic embedder instantiation based on type specification.
"""
import logging
from .sparkembedder import SparkEmbedder
from pyspark.sql import DataFrame

logger = logging.getLogger(__name__)

class EmbedderFactory:
    """
    Purpose:
        Creates and returns appropriate Spark embedder instances.

    Handles embedder type validation and instantiation.
    """
    @staticmethod
    def create(type: str, data: DataFrame, config: dict):
        """
        Purpose:
            Creates an embedder instance based on the specified type.
        
        Args:
            type (str): The embedder type ('spark').
            data (DataFrame): The Spark DataFrame containing text to embed.
            config (dict): Configuration parameters for the embedder.
        
        Returns:
            SparkEmbedder: The appropriate embedder instance.
        
        Raises:
            ValueError: If the embedder type is unknown.
        """
        logger.debug("Creating embedder of type: %s", type)
        if type == "spark":
            return SparkEmbedder(data, config)
        else:
            logger.error("Unknown embedder type: %s", type)
            raise ValueError(f"Unknown embedder type: {type}")