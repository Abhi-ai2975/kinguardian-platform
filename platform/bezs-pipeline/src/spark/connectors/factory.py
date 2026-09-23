"""
factory.py
====================================
Purpose:
    Provides a factory for creating different types of Spark connectors.
    Supports dynamic connector instantiation based on type specification.
"""
import logging
from .sparkconnector import SparkConnector
from .sparkairflowconnector import SparkAirflowConnector

logger = logging.getLogger(__name__)

class ConnectorFactory:
    """
    Purpose:
        Creates and returns appropriate Spark connector instances.
        Handles connector type validation and instantiation.
    """
    @staticmethod
    def create(type: str, config: dict):
        """
        Purpose:
            Creates a connector instance based on the specified type.

        Args:
            type (str): The connector type ('spark' or 'sparkairflowconnector').
            config (dict): Configuration parameters for the connector.

        Returns:
            SparkConnector or SparkAirflowConnector: The appropriate connector instance.

        Raises:
            ValueError: If the connector type is unknown.
        """
        logger.debug("Creating connector of type: %s", type)
        if type == "spark":
            return SparkConnector(config)
        elif type == "sparkairflowconnector":
            return SparkAirflowConnector(config)
        else:
            logger.error("Unknown connector type: %s", type)
            raise ValueError(f"Unknown connector type: {type}")