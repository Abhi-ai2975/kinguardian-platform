import logging
from typing import Any

from .rdbms import RDBMSConnector
from .gmail import GmailConnector
from .arxiv import ArxivConnector
from .elasticsearch import ElasticsearchConnector
from .opensearch import OpensearchConnector
from .jina import JinaConnector
from .s3 import S3Connector

logger = logging.getLogger(__name__)

"""
connector_factory.py
====================================
Purpose:
    Implementation of the Factory pattern to route requests to specific 
    connector classes based on a string identifier.
"""

class ConnectorFactory:
    """
    Purpose:
        The Orchestrator class that selects the appropriate connector 
        class based on user input.
    """

    @classmethod
    def get_connector(cls, connector_type: str, config: Any):
        """
        Purpose:
            Instantiates the requested connector class using the provided config.

        Args:
            connector_type (str): The type identifier ('rdbms', 'gmail', etc.).
            config (Any): Configuration data required by the chosen connector.

        Returns:
            Object: An instance of the requested connector class.
            
        Raises:
            ValueError: If the connector_type is not recognized.
        """
        logger.info(f"Factory creating connector for: {connector_type}")
        
        connector_type = connector_type.lower()
        
        if connector_type == "rdbms":
            return RDBMSConnector(config=config)
        elif connector_type == "gmail":
            return GmailConnector(config=config)
        elif connector_type == "arxiv":
            return ArxivConnector(config=config)
        elif connector_type == "elasticsearch":
            return ElasticsearchConnector(config=config)
        elif connector_type == "opensearch":
            return OpensearchConnector(config=config)
        elif connector_type == "jina":
            return JinaConnector(config=config)
        elif connector_type == "s3":
            return S3Connector(config=config)
        else:
            error_msg = f"Unsupported connector type: {connector_type}"
            logger.error(error_msg)
            raise ValueError(error_msg)