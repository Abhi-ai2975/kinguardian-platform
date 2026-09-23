import logging
from typing import Any

from .txtai import TxtaiEmbeddings
from .jina import JinaEmbeddingsService

logger = logging.getLogger(__name__)

"""
connector_factory.py
====================================
Purpose:
    Implementation of the Factory pattern to route requests to specific 
    connector classes based on a string identifier.
"""

class EmbedderFactory:
    """
    Purpose:
        The Orchestrator class that selects the appropriate connector 
        class based on user input.
    """

    @classmethod
    def get_embedder(cls, embedder_type: str, data: Any, config: Any):
        """
        Purpose:
            Instantiates the requested connector class using the provided config.

        Args:
            embedder_type (str): The type identifier ('esai', 'jina', etc.).
            data (Any): Data to be embedded.
            config (Any): Configuration data required by the chosen connector.

        Returns:
            Object: An instance of the requested connector class.
            
        Raises:
            ValueError: If the embedder_type is not recognized.
        """
        logger.info(f"Factory creating connector for: {embedder_type}")
        
        embedder_type = embedder_type.lower()
        
        if embedder_type == "txtai":
            return TxtaiEmbeddings(data=data, config=config)
        elif embedder_type == "jina":
            return JinaEmbeddingsService(data=data, config=config)
        else:
            error_msg = f"Unsupported embedder type: {embedder_type}"
            logger.error(error_msg)
            raise ValueError(error_msg)