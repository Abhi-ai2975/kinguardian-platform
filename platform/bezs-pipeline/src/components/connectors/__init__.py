import logging

"""
Connectors Package
==================
Purpose:
    A unified interface for connecting to various data sources.

"""

# Import the Factory and Connectors for easy external access
from .factory import ConnectorFactory
from .rdbms import RDBMSConnector
from .gmail import GmailConnector
from .arxiv import ArxivConnector
from .jina import JinaConnector
from .elasticsearch import ElasticsearchConnector
from .opensearch import OpensearchConnector
from .s3 import S3Connector

# Define the public API for the package
__all__ = [
    "ConnectorFactory",
    "RDBMSConnector",
    "GmailConnector",
    "ArxivConnector",
    "ElasticsearchConnector",
    "OpensearchConnector",
    "S3Connector",
]

# Set a default logger for the package to prevent "No handler found" warnings
logging.getLogger(__name__).addHandler(logging.NullHandler())