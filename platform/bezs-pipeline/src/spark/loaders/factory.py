"""
factory.py
====================================
Purpose:
    Provides a factory for creating different types of Spark loaders.
    Supports dynamic loader instantiation based on type specification.
"""
import logging
from .elasticsearch import ElasticsearchSparkLoader
from .sparkairflowloader import SparkAirflowLoader
from pyspark.sql import SparkSession

logger = logging.getLogger(__name__)

class LoaderFactory:
    """
    Purpose:
        Creates and returns appropriate Spark loader instances.
        Handles loader type validation and instantiation.
    """
    @staticmethod
    def create(type: str, connection: SparkSession, config: dict):
        """
        Purpose:
            Creates a loader instance based on the specified type.
        
        Args:
            type (str): The loader type ('elasticsearch' or 'sparkairflowloader').
            connection (SparkSession): The active Spark session for data operations.
            config (dict): Configuration parameters for the loader.
        
        Returns:
            ElasticsearchSparkLoader or SparkAirflowLoader: The appropriate loader instance.
        
        Raises:
            ValueError: If the loader type is unknown.
        """
        logger.debug("Creating loader of type: %s", type)
        if type == "elasticsearch":
            return ElasticsearchSparkLoader(connection, config)
        elif type == "sparkairflowloader":
            return SparkAirflowLoader(connection, config)
        else:
            logger.error("Unknown loader type: %s", type)
            raise ValueError(f"Unknown loader type: {type}")