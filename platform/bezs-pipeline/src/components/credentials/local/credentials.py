import logging
from ..base import CredentialProvider
from .config import CONNECTIONS

logger = logging.getLogger(__name__)

"""
credentials.py
====================================
Purpose:
    Implements a local credential provider that retrieves connection 
    parameters from a predefined configuration dictionary.
"""

class LocalCredentialProvider(CredentialProvider):
    """
    Purpose:
        Provides a mechanism to fetch credentials locally based on a connection ID.
    """
    def __init__(self, conn_id: str):
        """
        Purpose:
            Initializes the provider with a specific connection identifier.
        
        Args:
            conn_id (str): The key identifying the service in the config.
        """
        self.conn_id = conn_id
        self.config = CONNECTIONS
        logger.info(f"Initialized LocalCredentialProvider for connection: {conn_id}")

    def get_credentials(self):
        """
        Purpose:
            Retrieves the configuration dictionary for the initialized connection ID.

        Returns:
            dict: The connection parameters for the specified service.

        Raises:
            ValueError: If the connection ID is not found in the configuration.
        """
        if self.conn_id in self.config:
            logger.debug(f"Credentials retrieved successfully for: {self.conn_id}")
            return self.config[self.conn_id]
        else:
            error_msg = f"Invalid connection id: {self.conn_id}. Available: {list(self.config.keys())}"
            logger.error(error_msg)
            raise ValueError(error_msg)