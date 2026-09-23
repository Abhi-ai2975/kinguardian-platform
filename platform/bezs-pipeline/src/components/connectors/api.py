import httpx
import logging
from typing import Optional, Dict, Any
from .base import BaseConnector
from .schemas import ApiConfig

logger = logging.getLogger(__name__)

"""
api.py
====================================
Purpose:
    Handles asynchronous HTTP connections to the API using httpx.
"""

class ApiConnector(BaseConnector):
    """
    Purpose:
        Responsible for managing the lifecycle of an AsyncClient for 
        efficient, persistent HTTP requests to API.
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Purpose:
            Initialize ApiConnector settings.

        Args:
            config (Dict): 
                'api_key' (str): API key.
                'timeout' (int): Request timeout.
        """
        # Validate the incoming dictionary using Pydantic
        self.config = ApiConfig(**config)
        
        # Access attributes safely from the validated object
        self.timeout = self.config.timeout
        self._client: Optional[httpx.AsyncClient] = None
        
        logger.info("ApiConnector initialized")

    async def __call__(self) -> httpx.AsyncClient:
        """
        Purpose:
            Allows async access to the connector to retrieve the HTTP client.

        Returns:
            httpx.AsyncClient (connection object): The active async client.
        """
        return await self.connect()

    async def connect(self) -> httpx.AsyncClient:
        """
        Purpose:
            Creates or reuses an httpx.AsyncClient for persistent sessions.

        Args:
            None

        Returns:
            httpx.AsyncClient (connection object): Active HTTP client instance.
        """
        if self._client is None:
            # 1. Logic for Jina (or any API with a key)
            if self.config.api_key:
                logger.info("API Key found. Creating authenticated client.")
                headers = {
                    "Authorization": f"Bearer {self.config.api_key}",
                    "Content-Type": "application/json"
                }
                self._client = httpx.AsyncClient(headers=headers, timeout=self.timeout)
            
            # 2. Logic for Arxiv (No key, no headers parameter passed)
            else:
                logger.info("No API Key. Creating clean client for Arxiv.")
                self._client = httpx.AsyncClient(timeout=self.timeout)
        else:
            logger.debug("Reusing existing API HTTP client session.")
        
        return self._client

    async def close(self):
        """
        Purpose:
            Gracefully shuts down the async client and releases resources.

        Args:
            None
            
        Returns:
            None
        """
        if self._client:
            logger.info("Closing API HTTP client session.")
            await self._client.aclose()
            self._client = None
        else:
            logger.debug("Close called but no HTTP client session exists.")